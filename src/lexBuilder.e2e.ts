import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as chaiSpies from 'chai-spies';
import { describe } from 'mocha'
import { LexBuilder } from './lexBuilder'
import * as yamljs from 'js-yaml'
import * as fs from 'async-file'
import { SlsAlexa } from './alexa';
import { fail } from 'assert';

chai.should();
chai.use(chaiAsPromised);
chai.use(chaiSpies)
const expect = chai.expect;
const credentials = {
    region: "us-west-2",
    accessKeyId: process.env.AMAZON_CLIENT_ID!,
    secretAccessKey: process.env.AMAZON_CLIENT_SECRET!
}

describe('LexBuilder', async () => {
    it('LexBuilder-export', async () => {
        const lb = new LexBuilder({
            name: "aws",
            getCredentials: () => credentials
        });
        await lb.exportModel("test_en_US", 4);
    });

    it('LexBuilder-import', async () => {
        const lb = new LexBuilder({
            name: "aws",
            getCredentials: () => credentials
        });
        const alexaYaml = await fs.readTextFile('../test/serverless.yml');
        const alexaModel = yamljs.load(alexaYaml);
        await lb.importModel(alexaModel.custom.alexa, "test", "testSkillId");
    });
});