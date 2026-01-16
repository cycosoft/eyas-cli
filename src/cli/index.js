#!/usr/bin/env node

/* global process */

'use strict';

// define the actions for the CLI
const actions = {
	config: {
		enabled: false,
		label: `Configure`,
		description: `Launch the Eyas configuration editor`,
		command: `config`,
		action: runCommand_config
	},
	web: {
		enabled: true,
		label: `WEB: Generate "eyas.json" for eyas:// links`,
		description: `Consumers will need Eyas Desktop`,
		command: `web`,
		action: runCommand_web,
		options: [
			{
				flags: `-o, --open`,
				description: `Open the output folder after build`
			}
		]
	},
	db: {
		enabled: true,
		label: `DB: Build "*.eyas" file for Eyas users`,
		description: `Consumers will need Eyas Desktop`,
		command: `db`,
		action: runCommand_db,
		options: [
			{
				flags: `-o, --open`,
				description: `Open the output folder after build`
			}
		]
	}
};

// setup
const path = require(`path`);
const isDev = process.env.NODE_ENV === `dev`;
const TEST_SOURCE = `data`;
const consumerRoot = process.cwd();
const moduleRoot = isDev
	? consumerRoot
	: path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`);
const roots = require(path.join(moduleRoot, `dist`, `scripts`, `get-roots.js`));
const names = {
	packageJsonCore: `package.json`,
	packageJson: `package.json`,
	eyasAssets: `eyas-assets`,
	eyasInterface: `eyas-interface`,
	scripts: `scripts`,
	runner: `Start`
};
const paths = {
	dist: roots.eyasDist,
	build: roots.eyasBuild,
	configLoader: path.join(roots.dist, names.scripts, `get-config.js`),
	constants: path.join(roots.dist, names.scripts, `constants.js`),
	configDest: path.join(roots.eyasBuild, `.eyas.config.js`),
	testDest: path.join(roots.eyasBuild, TEST_SOURCE),
	packageJsonModuleSrc: path.join(roots.module, names.packageJson)
};
const { LOAD_TYPES } = require(paths.constants);
let config = null;

// set mode (disabled for now)
// actions.previewDev.enabled = isDev;

// Entry Point
(async () => {
	// load the user's config
	config = await require(paths.configLoader)(LOAD_TYPES.CLI);

	// import dependencies
	const { program: cli } = require(`commander`);

	// define the commands for the CLI
	defineCommands(cli);

	// if arguments were passed to the script
	if(process.argv.slice(2).length) {
		// parse the arguments and run the commands
		cli.parse();
	}else{
		// fall back to asking the user how to proceed
		askUser();
	}
})();

// ask the user what they want to do
function askUser() {
	// import
	const prompts = require(`prompts`);
	// add a space from the previous output
	userLog();

	// ask the user what they want to do
	prompts([
		{
			type: `select`,
			name: `action`,
			message: `What would you like to do?`,
			choices: Object.values(actions)
				.filter(action => action.enabled)
				.map(action => {
					return {
						title: action.label,
						value: action.command,
						description: action.description
					};
				}),
			initial: 1
		}
	])

	// respond to the user's choice
	.then((result) => {
		const action = result?.action;

		// exit if the user cancelled
		if(!action || !actions[action]) {
			process.exit(0);

			return;
		}

		// run the action
		actions[action].action();
	})

	.catch(() => {
		userLog(`Cancelled`);
		process.exit(0);
	});
}

// setup the CLI arguments
function defineCommands(cli) {
	// get the version from the module's package.json
	const { version } = require(paths.packageJsonModuleSrc);

	// define the details of the CLI
	cli
		.name(`eyas`)
		.description(`A serverless testing container for web applications`)
		.version(version);

	// define commands for the CLI from action object
	for(const action in actions) {
		// cache
		const cmd = actions[action];

		// skip if disabled
		if(!actions[action].enabled) { continue; }

		// define the argument with commander
		const command = cli
			.command(cmd.command)
			.description(cmd.description);

		// add options if defined
		if(cmd.options) {
			for(const option of cmd.options) {
				command.option(option.flags, option.description);
			}
		}

		// add the action
		command.action(cmd.action);
	}
}

// launch the configuration editor
async function runCommand_config() {
	// eslint-disable-next-line no-console
	console.log(`config command disabled`);
}

// the config that is bundled with the build
function getOutputConfig() {
	// create a new config file with the updated values in the build folder
	userLog(`Creating snapshot of config...`);
	const configCopy = JSON.parse(JSON.stringify(config));

	// delete the properties that aren't needed in the build
	delete configCopy.source;

	// let the builder know when this build expires
	userLog(`Set test expiration to: ${configCopy.meta.expires.toLocaleString()}`);

	// convert the config to a string
	const stringified = JSON.stringify(configCopy);

	// return the updated config in the several formats
	return {
		object: configCopy,
		asJson: stringified,
		asModule: `module.exports = ${stringified}`
	};
}

// generate a db output for distribution
async function runCommand_db() {
	const fs = require(`fs-extra`);
	const asar = require(`@electron/asar`);

	// get the test's config and prepare it for the build
	const modifiedConfig = getOutputConfig().asModule;

	// reset the output directory
	await fs.emptyDir(roots.eyasDist);

	// put the user's test into an asar file with .eyas extension
	const artifactName = `${config.title} - ${config.version}.eyas`
		// remove basic characters that could cause issues with the file system
		.replace(/[\/\\:\*\?"<>\|]/g, `_`);

	const testSourceDirectory = config.source;
	const outputSourceDirectory = path.join(roots.eyasDist, `source`);
	const destinationAsarPath = path.join(roots.eyasDist, artifactName);

	// create a source/ directory in the output directory
	await fs.emptyDir(outputSourceDirectory);

	// copy the user's test to the output directory
	await fs.copy(testSourceDirectory, outputSourceDirectory);

	// save the modifiedConfig to the new source/ directory
	await fs.writeFile(path.join(outputSourceDirectory, `.eyas.config.js`), modifiedConfig);

	// create an asar file from the source/ directory and store it in the output directory
	await asar.createPackage(outputSourceDirectory, destinationAsarPath);

	// delete the source/ directory
	await fs.remove(outputSourceDirectory);

	userLog(``);
	userLog(`🎉 File created -> ${artifactName}`);

	// open the folder if the --open flag is set (this is the command object when called from Commander)
	const command = this && typeof this.opts === `function` ? this : null;
	if(command && command.opts().open) {
		openFolder(roots.eyasDist);
	}
}

// generate a web output for distribution
async function runCommand_web() {
	const _fs = require(`fs-extra`);
	const artifactName = `eyas.json`;

	// get the test's config as JSON, and prepare it for the build
	const modifiedConfig = getOutputConfig().asJson;

	// save the modifiedConfig to the source/ directory
	await _fs.writeFile(path.join(config.source, artifactName), modifiedConfig);

	userLog(``);
	userLog(`🎉 File created -> ${artifactName}`);

	// open the folder if the --open flag is set (this is the command object when called from Commander)
	const command = this && typeof this.opts === `function` ? this : null;
	if(command && command.opts().open) {
		openFolder(config.source);
	}
}

// wrapper to differentiate user logs (allowed) from system logs (disallowed)
function userLog(string) {
	// setup
	const output = string ? `* ${string}` :``;

	// eslint-disable-next-line no-console
	console.log(output);
}

// wrapper to avoid linting errors
function userWarn(input) {
	// eslint-disable-next-line no-console
	console.warn(input);
}

// open a folder in the system's file explorer (cross-platform)
function openFolder(folderPath) {
	const { exec } = require(`child_process`);
	const absolutePath = path.resolve(folderPath);
	let command;

	// determine the command based on the platform
	if(process.platform === `win32`) {
		// Windows
		command = `explorer "${absolutePath}"`;
	} else if(process.platform === `darwin`) {
		// macOS
		command = `open "${absolutePath}"`;
	} else {
		// Linux and other Unix-like systems
		command = `xdg-open "${absolutePath}"`;
	}

	// execute the command
	exec(command, (error) => {
		// Windows explorer often returns a non-zero exit code even on success
		// Only show error if it's not Windows or if the error is significant
		if(error && process.platform !== `win32`) {
			userWarn(`Failed to open folder: ${error.message}`);
		}
	});
}