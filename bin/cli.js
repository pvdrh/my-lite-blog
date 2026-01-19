#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const { init, build, dev } = require('../lib/index.js');

program
  .name('lite-blog')
  .description('A lightweight static site generator for blogs')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new lite-blog project')
  .option('-d, --dir <directory>', 'Target directory', '.')
  .action((options) => {
    const targetDir = path.resolve(process.cwd(), options.dir);
    init(targetDir);
  });

program
  .command('build')
  .description('Build the static site')
  .option('-d, --dir <directory>', 'Project directory', '.')
  .action((options) => {
    const projectDir = path.resolve(process.cwd(), options.dir);
    build(projectDir);
  });

program
  .command('dev')
  .description('Start development server with hot reload')
  .option('-d, --dir <directory>', 'Project directory', '.')
  .option('-p, --port <port>', 'Server port', '3000')
  .action((options) => {
    const projectDir = path.resolve(process.cwd(), options.dir);
    const port = parseInt(options.port, 10);
    dev(projectDir, port);
  });

program.parse();
