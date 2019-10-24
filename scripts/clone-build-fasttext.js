const { exec } = require('child_process')
const path = require('path')
const fs = require("fs")
const chalk = require('chalk')
const configuration = require('../configuration.json')

const fastTextInstallPath = path.resolve(__dirname, `../${configuration.fastText.localRepositoryName}`)

if (fs.existsSync(fastTextInstallPath)) {
    console.log(chalk.yellow('Repository already cloned [delete it and try again]'))
} else {
  console.log(chalk.blue('Cloning "fastText"'))
  exec(`git clone ${configuration.fastText.remoteRepositoryUrl} ${fastTextInstallPath}`, (err, stdout, stderr) => {
    if (err) {
      console.log(chalk.red(stderr))
      return
    }
    console.log(chalk.green(`Cloning "fastText" SUCCESS ${stdout}`))
    console.log(chalk.blue('Running "make"'))
    exec(`make -C ${fastTextInstallPath}`, (err, stdout, stderr) => {
      if (err) {
        console.log(chalk.red(stderr))
        return
      }
      console.log(stdout)
      console.log(chalk.green('Running "make" SUCCESS'))
    })
  })
}
