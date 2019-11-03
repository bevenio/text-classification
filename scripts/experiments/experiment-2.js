const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const Browser = require('zombie')

/***************************************
 * SETTINGS
 ***************************************/

const settings = {
    url: 'stackoverflow.com',
    paths: {
        tags: 'tags?page={{page}}&tab=popular'
    },
    requestTimeout: 0,
    requestWaitTime: 30000
}

/***************************************
 * HELPERS
 ***************************************/
 
const replaceHandle = (string, {name = '', value = ''}) => {
   return string.replace(`{{${name}}}`, value)
}

/***************************************
 * OPEN THE WEBSITE
 ***************************************/

const makeCompleteUrl = (url, path) => {
    return `http://${url}/${path || ''}`
}

const openWebsite = () => {
    return new Promise((resolve, reject) => {
        console.log(`[${chalk.cyan(settings.url)}] loading in headless browser`)
        const browser = new Browser({
            waitDuration: settings.requestWaitTime
        })
        browser.visit(makeCompleteUrl(settings.url), () => {
            browser.status === 200 ? resolve(browser) : reject(browser.status)
        })
    })
}

/***************************************
 * OPEN THE TAGS PAGE AND EXTRACT TAGS
 ***************************************/

const isTagJsonFileExisting = () => {
    if (fs.existsSync(path.resolve(__dirname, ('./outputs/experiment-2-tags.json')))) {
        return true
    }
    return false
}

const saveTags = (tags) => {
    fs.outputFile(
        path.resolve(__dirname, ('./outputs/experiment-2-tags.json')),
        JSON.stringify({
            tags: tags
        }, null, 1),
        (error) => {
            if(error) {
                console.log(chalk.red(error))
            } else {
                console.log(`[${chalk.cyan(settings.url)}] tags have been saved successfully`)
            }
        }
    )
}

const extractTagsRecursively = (browser, tags, currentPage, lastPage, resolve, reject) => {
    setTimeout(() => {
        browser.clickLink('#tags_list > div.pager.fr > a:last-child', () => {
            if(browser.status === 200) {
                const newTags = browser.queryAll('#tags-browser > div > a').map(element => browser.text(element))
                const mergedTags = [...tags, ...newTags]
                const percentage = Math.round(currentPage / lastPage * 100)
                console.log(`[${chalk.cyan(settings.url)}] extracted tags of page ${currentPage}/${lastPage} (P: ${chalk.cyan(percentage + '%')} T:${mergedTags.length})`)
                if(currentPage === lastPage) {
                    resolve(tags)
                    return
                }
                try {
                    extractTagsRecursively(browser, mergedTags, (currentPage + 1), lastPage, resolve, reject)
                } catch(error) {
                    console.error(`[${chalk.cyan(settings.url)}] error extracting page ${chalk.orange((currentPage + 1))}/${lastPage}, trying again`)
                    extractTagsRecursively(browser, mergedTags, (currentPage + 1), lastPage, resolve, reject)
                }
            } else {
                console.error(`[${chalk.cyan(settings.url)}] error loading page ${chalk.orange((currentPage))}/${lastPage} - ${chalk.red(browser.status)}`)
                extractTagsRecursively(browser, mergedTags, currentPage, lastPage, resolve, reject)
            }
        })
    }, settings.requestTimeout)
}

const extractTags = (browser) => {
    return new Promise((resolve, reject) => {
        browser.visit(makeCompleteUrl(settings.url, replaceHandle(settings.paths.tags, {name: 'page', value: 1})), () => {
            if(browser.status === 200) {
                const tagPages = Number(browser.text('#tags_list > div.pager.fr > a:nth-child(7) > span'))
                console.log(`[${chalk.cyan(settings.url)}] has ${chalk.cyan(tagPages)} pages with tag content`)
                extractTagsRecursively(browser, [], 1, tagPages, resolve, reject)
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
        if(!isTagJsonFileExisting()) {
            // Extract tags only if file doest exist already
            extractTags(browser)
                .then((tags) => {
                    console.log(`[${chalk.cyan(settings.url)}] extracted ${chalk.cyan(tags.length)} tags`)
                    saveTags(tags)
                }).catch(code => {
                    console.error(`[${chalk.cyan(settings.url)}] responded with ${chalk.red(code)}`)
                })
        }
    }).catch(code => {
        console.error(`[${chalk.cyan(settings.url)}] responded with ${chalk.red(code)}`)
    })

    // Keep node process alive "forever"
    setInterval(() => {}, 1 << 30)