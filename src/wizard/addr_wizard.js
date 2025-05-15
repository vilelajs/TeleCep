import { Scenes, Composer, Markup } from "telegraf";

import axios from "axios";

import unidadesFederativas from "../db/unidades_federativas.js";

const confirmacao = Markup.inlineKeyboard([
  Markup.button.callback("✅ Sim", "s"),
  Markup.button.callback("❌ Não", "n"),
]);

const botoes = (lista) =>
  Markup.inlineKeyboard(
    lista.map((objeto) => Markup.button.callback(objeto.nome, objeto.sigla)),
    { columns: 2 }
  );

const selecionarEstado = new Composer();

selecionarEstado.action(/[A-Z]{2}/i, async (ctx) => {
  await ctx.editMessageReplyMarkup({ reply_markup: null });
  ctx.wizard.state.sigla = ctx.match[0];
  await ctx.reply("Por favor, informe o nome da cidade:");
  ctx.wizard.next();
});

selecionarEstado.use(async (ctx) => {
  await ctx.reply("❌ Dados inválidos. Selecione um estado da lista");
});

const confirmarBusca = new Composer();

confirmarBusca.action("s", async (ctx) => {
  await ctx.editMessageReplyMarkup();
  const { sigla, cidade, rua } = ctx.wizard.state;

  try {
    const response = await axios.get(
      `https://viacep.com.br/ws/${sigla}/${cidade}/${rua}/json/`
    );

    ctx.wizard.state.response = response.data;

    if (ctx.wizard.state.response.length >= 1) {
      if (ctx.wizard.state.response.length === 1) {
        await ctx.replyWithHTML(
          `O CEP para o endereço indicado é <strong><code>${ctx.wizard.state.response[0].cep}</code></strong>`
        );
        await ctx.reply(`👋 Até logo`);
        return ctx.scene.leave();
      } else {
        await ctx.reply(
          "Escolha um dos resultados:",
          Markup.inlineKeyboard(
            ctx.wizard.state.response.map((objeto) =>
              Markup.button.callback(
                `${objeto.logradouro}, bairro ${objeto.bairro}`,
                objeto.cep
              )
            ),
            { columns: 1 }
          )
        );
        ctx.wizard.next();
      }
    } else {
      await ctx.reply(
        "Ops! Algo deu errado com sua consulta. Confira os dados e tente de novo, por favor."
      );
    }
  } catch (error) {
    await ctx.reply(
      "Ops! Algo deu errado com sua consulta. Confira os dados e tente de novo, por favor."
    );
  }
});

confirmarBusca.action("n", async (ctx) => {
  await ctx.editMessageReplyMarkup();
  await ctx.reply(
    `${ctx.update.callback_query.from.first_name}, a operação foi cancelada com sucesso.`
  );
  return ctx.scene.leave();
});

const escolhaResultado = new Composer();

escolhaResultado.action(/\d{5}-\d{3}/, async (ctx) => {
  await ctx.editMessageReplyMarkup();
  await ctx.replyWithHTML(
    `O CEP para o endereço indicado é <strong><code>${ctx.match[0]}</code></strong>`
  );
  await ctx.reply(`👋 Até logo`);
  return ctx.scene.leave();
});

const addrWizardScene = new Scenes.WizardScene(
  "addr",
  async (ctx) => {
    await ctx.reply(
      "📍 Selecione o estado ou /sair para cancelar a operação.",
      botoes(unidadesFederativas)
    );
    ctx.wizard.next();
  },
  selecionarEstado,
  async (ctx) => {
    ctx.wizard.state.cidade = ctx.message.text;
    await ctx.reply("Informe o nome da rua:");
    ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.rua = ctx.message.text;
    const { sigla, cidade, rua } = ctx.wizard.state;
    await ctx.replyWithHTML(
      `📋 Resumo:\n\n<strong>Sigla do estado:</strong> ${sigla}\n<strong>Cidade:</strong> ${cidade}\n<strong>Rua:</strong> ${rua}\n\n<strong>Deseja confirmar a busca no sistema?</strong>`,
      confirmacao
    );
    ctx.wizard.next();
  },
  confirmarBusca,
  escolhaResultado
);

addrWizardScene.command("sair", async (ctx) => {
  await ctx.reply(`👋 Até logo`);
  return ctx.scene.leave();
});

export default addrWizardScene;
