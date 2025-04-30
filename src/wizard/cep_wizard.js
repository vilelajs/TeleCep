import { Scenes, Composer, Markup } from "telegraf";
import axios from "axios";

const confirmacao = Markup.inlineKeyboard([
  Markup.button.callback("🔁 Sim", "s"),
  Markup.button.callback("❌ Não", "n"),
]);

const buscarCepStep = new Composer();

buscarCepStep.hears(/\d{5}-?\d{3}/, async (ctx) => {
  const entrada = ctx.match[0];
  const cep = entrada.replace(/\D/g, "");
  const nameUser = ctx.update.message.from.first_name;

  try {
    const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
    const data = response.data;

    if (data.erro) {
      await ctx.reply(
        `Hmm... ${nameUser}, esse CEP parece estar no formato certo, mas não encontramos ele. 🧐`
      );
      await ctx.reply(
        `Use:\n` + `/cep - Buscar por CEP\n` + `/addr - Buscar por endereço`
      );
      return ctx.scene.leave();
    } else {
      let addres = `${data.logradouro}`;

      if (data.complemento) {
        addres += ` - ${data.complemento}`;
      }

      addres += `, ${data.bairro} - ${data.localidade}/${data.uf}`;

      await ctx.replyWithHTML(
        `🔍 Resultados encontrados para o CEP <b>${data.cep}</b>:\n\n<code>${addres}</code>`
      );
      await ctx.reply("Deseja buscar outro CEP?", confirmacao);

      return ctx.wizard.next();
    }
  } catch (error) {
    await ctx.reply(
      `${nameUser}, algo deu errado, mas não se preocupe - não é culpa sua. Tente novamente mais tarde, por favor.`
    );
    return ctx.scene.leave();
  }
});

buscarCepStep.use(async (ctx) => await ctx.reply("❌ CEP inválido."));

const perguntarNovamenteStep = new Composer();

perguntarNovamenteStep.action("s", async (ctx) => {
  await ctx.editMessageReplyMarkup();
  await ctx.reply("📮 Ok! Vamos buscar outro CEP.");
  return ctx.wizard.selectStep(1);
});

perguntarNovamenteStep.action("n", async (ctx) => {
  await ctx.editMessageReplyMarkup();
  await ctx.reply(`👋 Até logo`);
  return ctx.scene.leave();
});

perguntarNovamenteStep.use(async (ctx) =>
  await ctx.reply("Apenas confirme. Deseja buscar outro CEP?", confirmacao)
);

const cepWizardScene = new Scenes.WizardScene(
  "cep",
  (ctx) => {
    ctx.reply(
      "📮 Informe o CEP que deseja consultar ou /sair para cancelar a operação."
    );
    ctx.wizard.next();
  },
  buscarCepStep,
  perguntarNovamenteStep
);

cepWizardScene.command("sair", async (ctx) => {
  await ctx.reply(`👋 Até logo`);
  return ctx.scene.leave();
});

export default cepWizardScene;
