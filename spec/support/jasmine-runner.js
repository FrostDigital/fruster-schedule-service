const errors = require("../../lib/errors");
const Jasmine = require('jasmine');
const SpecReporter = require('jasmine-spec-reporter');

const noop = function() {};
const jrunner = new Jasmine();

require("fruster-custom-matchers")(errors); // add custom matchers once jrunner exists

jrunner.configureDefaultReporter({print: noop});    // remove default reporter logs
jasmine.getEnv().addReporter(new SpecReporter());   // add jasmine-spec-reporter
jrunner.loadConfigFile();                           // load jasmine.json configuration
jrunner.execute();