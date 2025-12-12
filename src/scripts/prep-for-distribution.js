#!/usr/bin/env node

/* global process */

'use strict';

// Import dependencies
const fs = require(`fs-extra`);

// setup paths
const path = require(`path`);
const roots = require(`./get-roots`);
const names = {
	cli: `cli`
};
const paths = {
	dist: roots.dist,
	cliSrcFile: path.join(roots.src, names.cli, `index.js`),
	cliDestFile: path.join(roots.dist, names.cli, `index.js`),
	scriptsSrc: path.join(roots.src, `scripts`),
	scriptsDist: path.join(roots.dist, `scripts`)
};

// Allow for "root" await calls
(async () => {
	// Prep the destination directory
	await fs.emptyDir(roots.dist);

	// Copy the scripts
	await fs.copy(
		path.join(paths.scriptsSrc, `get-config.js`),
		path.join(paths.scriptsDist, `get-config.js`)
	);

	await fs.copy(
		path.join(paths.scriptsSrc, `get-roots.js`),
		path.join(paths.scriptsDist, `get-roots.js`)
	);

	await fs.copy(
		path.join(paths.scriptsSrc, `constants.js`),
		path.join(paths.scriptsDist, `constants.js`)
	);

	// Copy the CLI
	console.log(`copying ${paths.cliSrcFile}`);
	await fs.copy(paths.cliSrcFile, paths.cliDestFile);

	console.log(`🎉 complete`);
})();
