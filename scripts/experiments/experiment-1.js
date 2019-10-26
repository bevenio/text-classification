const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const request = require('request')
const cheerio = require('cheerio')
const Chance = require('chance')

const chance = new Chance()

const settings = {
    randomSiteAmount: 1000,
    maxRequestTimeout: 5000,
    outPutFilePath: './../../training_data/json_unlabeled/',
    outputFilename: 'webcontent.unlabeled.json'
}

const state = {
    randomSiteRequestCounter: 0,
    responseNo: 0
}

let jsonFileContent = {
    data: []
}

try {
    const jsonData = require(settings.outPutFilePath + settings.outputFilename)
    jsonFileContent = jsonData
    console.log(chalk.green(`Using and extending already existing "${settings.outputFilename}"`))
} catch(error) {
    console.log(chalk.yellow(`Creating a new "${settings.outputFilename}" since there is none existing`))
}

const trackResponse = () => {
    state.responseNo += 1
    return state.responseNo
}

const requestSite = ({url, log = true}) => {
    return new Promise((resolve, reject) => {
        request({
            url: url,
            timeout: settings.maxRequestTimeout
        }, (error, response, body) => {
            const responseNo = trackResponse()
            if(error) {
                log ? console.log(chalk.yellow(`[${chalk.white(responseNo)}][${chalk.white(url)}] responded with error code "${error.code}"`)) : null
                reject()
                return
            }
            log ? console.log( chalk.green(`[${chalk.white(responseNo)}][${chalk.white(url)}] responded with ${response ? response.statusCode : 'no status code'}`)) : null
            resolve({
                url: url,
                body: body
            })
        })
    })
}

const makeRandomText = (length) => {
    var result           = ''
    var characters       = 'abcdefghijklmnopqrstuvwxyz'
    var charactersLength = characters.length
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}

const makeRandomUrl = ({min = 3, max = 10}) => {
    const centerStringLength = Math.round(Math.random() * (max - min)) + min
    let centerString
    if(Math.random() >= 0.5) {
        centerString = makeRandomText(centerStringLength)
    } else { 
        centerString = chance.word({length: centerStringLength})
    }
    return `http://${centerString}.com`
}

const saveToFile = () => {
    fs.outputFile(
        path.resolve(__dirname, (settings.outPutFilePath + settings.outputFilename)),
        JSON.stringify(jsonFileContent, null, 1),
        (error) => {
            if(error) {
                console.log(chalk.red(error))
            } else {
                console.log(chalk.green(`File has been saved successfully as "${settings.outputFilename}"`))
            }
        }
    )
}

const writeFileContent = (sentence) => {
    jsonFileContent.data.push({
        text: sentence,
        labels: []
    })
}

const requestRandomSitesTitle = () => {
    if(state.randomSiteRequestCounter < settings.randomSiteAmount) {
        state.randomSiteRequestCounter += 1
        requestSite({
            url: makeRandomUrl({min: 3, max: 10}),
            log: false
        }).then(({url, body}) => {
            const site = cheerio.load(body)
            const content = site('h1').text().replace(/\s\s+/g, ' ')
            if(content) {
                console.log(`[${new Date().toTimeString()}] ${chalk.cyan(url)}: ${content}`)
                writeFileContent(content)
            }
        }).catch(() => {

        }).finally(() => {
            requestRandomSitesTitle()
        })
    } else {
        saveToFile()
        console.log(chalk.green('DONE! 🤜🏻🤛🏼'))
    }
}

requestRandomSitesTitle()
