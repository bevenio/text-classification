const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')

const classificastions = ['sports', 'duty', 'shopping', 'deadline', 'relax', 'work', 'private', 'social', 'financial']
const fileName = path.resolve(__dirname, './../training_data/json/example.data.json')
let jsonData = {
    data: []
}

try {
    const jsonFileData = require('./../training_data/json/example.data.json')
    jsonData = jsonFileData
    console.log(chalk.green('Using and extending already existing "example.data.json"'))
} catch(error) {
    console.log(error)
    console.log(chalk.yellow('Creating a new "example.data.json" since there is none existing'))
}

const choices = {
    classificationQuestion: {
        name: 'Choose categories that match your sentence',
        type: 'checkbox',
        choices: classificastions.map((value) => {
            return {name: value, value: value}
        })
      },
      nameQuestion: {
        name: 'Type a sentence (Type "end:x" to stop training)',
        type: 'input'
      }
}

/******************************************
 * ENDING TRAINING
 ******************************************/

const endTraining = () => {
    fs.writeFile(fileName, JSON.stringify(jsonData, null, 1), (error) => {
        if(error) {
            console.log(chalk.red(error))
        } else {
            console.log(chalk.green('Training data has been saved in "example.data.json"'))
        }
    })
}


/******************************************
 * CLASSIFICATION QUESTION
 ******************************************/

processClassificationQuestion = (sentence, classifications) => {
    jsonData.data.push({
        text: sentence,
        labels: classifications
    })
    sentenceQuestion()
}

const classificationQuestion = (sentence) => {
    inquirer
        .prompt(choices.classificationQuestion)
        .then(answers => {
            processClassificationQuestion(sentence, answers[choices.classificationQuestion.name])
        })
}

/******************************************
 * SENTENCE QUESTION
 ******************************************/

const processSentenceQuestion = (value) => {
    switch (value) {
        case 'end:x':
            endTraining()
        break
        default:
            classificationQuestion(value)
        break
    }
}
  
const sentenceQuestion = () => {
    inquirer
        .prompt(choices.nameQuestion)
        .then(answers => {
            processSentenceQuestion(answers[choices.nameQuestion.name])
        })
}

/******************************************
 * PROGRAMM
 ******************************************/

sentenceQuestion()
