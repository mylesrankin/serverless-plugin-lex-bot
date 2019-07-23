import { ServerlessInstance, ServerlessOptions, ServerlessProvider, LexCustomConfig } from "./sls";
import { inspect } from 'util'
import { LexBuilder } from "./lexBuilder";


class LexBot {
  public commands: any;
  public hooks: any;
  public provider: ServerlessProvider;
  constructor(
    private serverless: ServerlessInstance,
    private options: ServerlessOptions) {
    this.provider = this.serverless.getProvider('aws');


    this.commands = {
      deploy: {
        lifecycleEvents: [
          'resources'
        ]
      }
    };

    this.hooks = {
      'after:deploy:resources': async () => this.deployLex(),
    };
  }

  async deployLex() {
    const lb = new LexBuilder(this.provider);
    const custom = this.serverless.service.custom;
    const lex = custom.lex;
    for (var bot of lex) {
      console.log("LEX:" + bot.name)
      const arns = await lb.importModel(custom.alexa, bot.name, bot.alexaImportSkillId);
    }
  }
}

module.exports = LexBot;