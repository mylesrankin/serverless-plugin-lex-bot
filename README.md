# serverless-plugin-lex-bot
[serverless](https://github.com/serverless/serverless) plugin for [AWS Lex](https://aws.amazon.com/lex/)

This plugin will deploy NLP model to AWS Lex.
The current implementation is able to deploy NLP model from [Alexa](https://github.com/marcy-terui/serverless-alexa-skills)'s  
yaml in `custom\alexa\skills\models\locale\interactionModel\languageModel` see [serverless.yml](./test/serverless.yml) sample.
It would convert the Alexa syntaxt into Lex syntax, create import zip file and upload the bot. 
It would also build the bot and label it with `latest` version alias.
Since Lex intents and slot types are global, this plugin will prefix their names with name of the bot and locale.
It would also skip Alexa built-in intent types such as `AMAZON.MoreIntent` which are not supported by Lex. 
Built-in intent types which are supported like `AMAZON.RepeatIntent` would be maped to Lex built-in.

At the moment it's very crude plugin with lot of possible improvements. 

