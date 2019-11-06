const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
let Browser = require('zombie')

/***************************************
 * SETTINGS
 ***************************************/

const settings = {
    url: 'stackoverflow.com',
    paths: {
        tags: 'tags?page={{page}}&tab=popular',
        questions: 'questions?tab=newest&page={{page}}'
    },
    outputs: {
        tags: 'tags.txt',
        questions: 'stack_titles.txt'
    },
    requestTimeout: 500,
    requestWaitTime: 30000,
    memoryAvailableInMb: 1372 // default
}

/***************************************
 * HELPERS
 ***************************************/

const reRequire = (moduleName) => {
    const entry = require.cache[require.resolve(moduleName)]
    entry.children.forEach((child) => {
        delete require.cache[child.filename]
    })
    delete require.cache[moduleName]
    if (global.gc) {
        global.gc()
    }
    return require(moduleName)
}
 
const replaceHandle = (string, {name = '', value = ''}) => {
   return string.replace(`{{${name}}}`, value)
}

const getMemoryUsage = () => {
    return Math.round(process.memoryUsage().heapUsed / (1024 * 1024))
}

const getMemoryUsageString = () => {
    const usedMemoryInMb = Math.round((getMemoryUsage() / settings.memoryAvailableInMb) * 100)
    if(usedMemoryInMb > 70) {
        return chalk.red(`${usedMemoryInMb}%`)
    } else if(usedMemoryInMb > 50) {
        return chalk.yellow(`${usedMemoryInMb}%`)
    } else {
        return chalk.green(`${usedMemoryInMb}%`)
    }
}

/***************************************
 * OPEN THE WEBSITE
 ***************************************/

const makeCompleteUrl = (url, path) => {
    return `http://${url}/${path || ''}`
}

const openWebsite = ({url = settings.url, silent = false}) => {
    return new Promise((resolve, reject) => {
        if(!silent) {
            console.log(`[${chalk.cyan(url)}] loading in headless browser`)
        }
        const browser = new Browser({
            waitDuration: settings.requestWaitTime
        })
        browser.visit(makeCompleteUrl(url), () => {
            browser.status === 200 ? resolve(browser) : reject(browser.status)
        })
    })
}

/***************************************
 * OPEN THE TAGS PAGE AND EXTRACT TAGS
 ***************************************/

const saveExtractedTags = (tags) => {
    const filePath = path.resolve(__dirname, `./outputs/${settings.outputs.tags}`)
    if (!fs.existsSync(filePath)) {
        fs.outputFileSync(filePath, '')
    }
    fs.appendFile(filePath, tags.join('\n'), function (err) {
        if (err) throw err
    })
}

const extractTagsRecursively = (browser, currentPage, lastPage) => {
    return new Promise((resolve, reject) => {
        browser.deleteCookies()
        browser.clickLink('#tags_list > div.pager.fr > a:last-child', () => {
            if(browser.status === 200) {
                const tags = browser.queryAll('#tags-browser > div > a').map(element => browser.text(element))
                const percentage = Math.round(currentPage / lastPage * 100)
                console.log(`[${chalk.cyan(settings.url)}] extracted tags of page ${currentPage}/${lastPage} (P: ${chalk.cyan(percentage + '%')} T:${tags.length} M:${getMemoryUsageString()})`)
                resolve(tags)
            } else {
                console.error(`[${chalk.cyan(settings.url)}] error loading page ${chalk.yellow((currentPage))}/${lastPage} - ${chalk.red(browser.status)}`)
                reject(browser.status)
            }
        })
    })
}

const extractTags = (browser) => {
    return new Promise((resolve, reject) => {
        browser.visit(makeCompleteUrl(settings.url, replaceHandle(settings.paths.tags, {name: 'page', value: 1})), async () => {
            if(browser.status === 200) {
                const tagPages = Number(browser.text('#tags_list > div.pager.fr > a:nth-child(7) > span'))
                console.log(`[${chalk.cyan(settings.url)}] has ${chalk.cyan(tagPages)} pages with tag content`)
                for(let i = 1; i <= tagPages; i++) {
                    if(getMemoryUsage() / settings.memoryAvailableInMb > 0.5) {
                        // Memory usage > X%
                        const currentUrl = browser.location._url.replace('https://', '')
                        browser.window.close()
                        browser = null
                        Browser = null
                        Browser = reRequire('zombie')
                        browser = await openWebsite({url: currentUrl, silent: true})
                    }
                    const extractedTags = await extractTagsRecursively(browser, i, tagPages)
                    saveExtractedTags(extractedTags)
                }
                resolve()
            } else {
                reject(browser.status)
            }
        })
    })
}
/*************************************************
 * OPEN THE POP PAGE AND EXTRACT TEXT AND TAGS
 *************************************************/

const getStore = () => {
    return require('./store/store.json')
}

const setStore = (store) => {
    fs.outputFileSync(
        path.resolve(__dirname, './store/store.json'),
        JSON.stringify(store, null, 1),
        (error) => {
            if(error) {
                console.log(chalk.red(error))
            }
        }
    )
}

const saveExtractedQuestions = (questions) => {
    const filePath = path.resolve(__dirname, `./outputs/${settings.outputs.questions}`)
    if (!fs.existsSync(filePath)) {
        fs.outputFileSync(filePath, '')
    }
    const questionClassifierLines = questions.map(question => {
        return `${question.tags.map(tag => `__label__${tag}`).join(' ')} ${question.title}`
    })
    fs.appendFile(filePath, questionClassifierLines.join('\n').concat('\n'), function (err) {
        if (err) throw err
    })
}

const extractQuestionTitlesRecursively = (browser, currentPage, lastPage) => {
    return new Promise((resolve, reject) => {
        browser.deleteCookies()
        browser.clickLink('#mainbar > div.pager.fl > a:last-child', () => {
            if(browser.status === 200) {
                const percentage = (Math.round(currentPage / lastPage * 10000) /100)
                const questions = browser.queryAll('div.summary').map(container => {
                    return {
                        title: browser.text('div.summary > h3 > a', container),
                        tags: browser.queryAll('div.summary > div.tags > a', container).map(element => browser.text(element))
                    }
                })
                console.log(`[${chalk.cyan(settings.url)}] extracted questions of page ${currentPage}/${lastPage} (P: ${chalk.cyan(percentage + '%')} Q:${questions.length} M:${getMemoryUsageString()})`)
                resolve(questions)
            } else {
                console.error(`[${chalk.cyan(settings.url)}] error loading page ${chalk.yellow((currentPage))}/${lastPage} - ${chalk.red(browser.status)}`)
                reject(browser.status)
            }
        })
    })
}

const extractQuestionTitles = (browser) => {
    return new Promise((resolve, reject) => {
        browser.visit(makeCompleteUrl(settings.url, replaceHandle(settings.paths.questions, {name: 'page', value: 1})), () => {
            const questionPages = Number(browser.text('#mainbar > div.pager.fl > a:nth-child(7) > span'))
            if(browser.status === 200) {
                const store = getStore()
                browser.visit(makeCompleteUrl(settings.url, replaceHandle(settings.paths.questions, {name: 'page', value: store.nextPage})), async () => {
                    if(browser.status === 200) {
                        console.log(`[${chalk.cyan(settings.url)}] has ${chalk.cyan(questionPages)} pages with question content`)
                        for(let i = store.nextPage; i <= questionPages; i++) {
                            const extractedQuestions = await extractQuestionTitlesRecursively(browser, i, questionPages)
                            saveExtractedQuestions(extractedQuestions)
                            setStore({
                                ...store,
                                nextPage: (i + 2)
                            })
                            if(getMemoryUsage() / settings.memoryAvailableInMb > 0.8) {
                                console.log(`Extracted questions from ${chalk.cyan(i - store.nextPage)} pages`)
                                setStore({
                                    nextPage: (i + 2),
                                    restarts: (store.restarts + 1),
                                    stats: {
                                        questionsAverage: ((i - store.nextPage) + store.stats.questionsAverage * store.stats.questionsAverageAmount) / (store.stats.questionsAverageAmount + 1),
                                        questionsAverageAmount: (store.stats.questionsAverageAmount + 1),
                                        percentProcessed: (Math.round((i / questionPages) * 10000) / 100)
                                    }
                                })
                                process.exit(0)
                            }
                        }
                        resolve()
                    } else {
                        reject(browser.status)
                    }
                })
            } else {
                reject(browser.status)
            }
        })
    })
}

/***************************************
 * PROGRAMM
 ***************************************/

openWebsite(settings)
    .then(browser => {
        console.log(`[${chalk.cyan(settings.url)}] responded with ${chalk.cyan(browser.status)}`)
        // extractTags(browser)
        //     .then((tags) => {
        //         console.log(`[${chalk.cyan(settings.url)}] extracted ${chalk.green('all')} tags`)
        //     }).catch(code => {
        //         console.error(`[${chalk.cyan(settings.url)}] responded with ${chalk.red(code)}`)
        //     })
        extractQuestionTitles(browser)
            .then(() => {
                console.log(`[${chalk.cyan(settings.url)}] extracted ${chalk.green('all')} questions`)
            }).catch(code => {
                console.error(`[${chalk.cyan(settings.url)}] responded with ${chalk.red(code)}`)
            })
    }).catch(code => {
        console.error(`[${chalk.cyan(settings.url)}] responded with ${chalk.red(code)}`)
    })

    // Keep node process alive "forever"
    setInterval(() => {}, 1 << 30)