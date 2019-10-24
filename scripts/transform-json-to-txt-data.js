const path = require('path')
const chalk = require('chalk')
const fs = require('fs-extra')
const args = process.argv.slice(2)

const createLabel = (labelName) => {
    return `__label__${labelName}`
}

const jsonFileName = args[0] || 'data.json'
const  validationPercentage = Number(args[1] || 0)

if(!validationPercentage && validationPercentage !== 0) {
    console.log(chalk.red('Validation percentage must be a number between 0 ... 100'))
    return
}

if(validationPercentage > 100) {
    console.log(chalk.red('Cannot have a validation percentage of over 100'))
    return
}

console.log(chalk.blue(`Using a ${chalk.green(`${validationPercentage}%`)} validation`))

try {
    console.log(chalk.blue('Converting file'))
    const jsonFilePath = path.resolve(__dirname, `./../training_data/json/${jsonFileName}`)
    const trainTextFilePath = path.resolve(__dirname, `./../training_data/txt/${jsonFileName.replace('.json', '.train')}`)
    const validationTextFilePath = path.resolve(__dirname, `./../training_data/txt/${jsonFileName.replace('.json', '.valid')}`)

    console.log(chalk.white(`${chalk.green(`[Source]`)}: ${path.resolve(jsonFilePath)}`))
    console.log(chalk.white(`${chalk.green(`[Training]`)}: ${path.resolve(trainTextFilePath)}`))
    console.log(chalk.white(`${chalk.green(`[Validation]`)}: ${path.resolve(validationTextFilePath)}`))

    console.log(chalk.blue('Reading json file...'))
    const jsonFile = require(`./../training_data/json/${jsonFileName}`)

    let trainTextFileContent = ''
    let validationTextFileContent = ''

    const trainingAmountFactor = Math.round(jsonFile.data.length * ((100 - validationPercentage) / 100))
    const validationAmountFactor = Math.round(jsonFile.data.length * (validationPercentage) / 100)

    console.log(chalk.white(`${chalk.green(`[Training]`)}: Creating ${trainingAmountFactor} entries`))
    console.log(chalk.white(`${chalk.green(`[Validation]`)}: Creating ${validationAmountFactor} entries`))

    for(let i = 0; i < trainingAmountFactor; i++) {
        trainTextFileContent += `${jsonFile.data[i].labels.map(createLabel).join(' ')} ${jsonFile.data[i].text} \n`
    }

    for(let i = trainingAmountFactor; i < jsonFile.data.length; i++) {
        validationTextFileContent += `${jsonFile.data[i].labels.map(createLabel).join(' ')} ${jsonFile.data[i].text} \n`
    }

    console.log(chalk.blue(`Writing to ${chalk.green(`[Training]`)} txt file...`))
    fs.outputFile(trainTextFilePath, trainTextFileContent, function (error) {
        if(error) {
            console.log(chalk.red(error))
        } else {
            console.log(chalk.green(`File has been saved successfully as "${jsonFileName.replace('.json', '.train')}"`))
        }
    })

    console.log(chalk.blue(`Writing to ${chalk.green(`[Validation]`)} txt file...`))
    fs.outputFile(validationTextFilePath, validationTextFileContent, function (error) {
        if(error) {
            console.log(chalk.red(error))
        } else {
            console.log(chalk.green(`File has been saved successfully as "${jsonFileName.replace('.json', '.valid')}"`))
        }
    })

} catch(error) {
    console.log(chalk.red(error))
}