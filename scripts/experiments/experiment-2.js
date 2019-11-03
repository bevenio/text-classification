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
    outputs: {
        tags: 'tags.txt'
    },
    requestTimeout: 500,
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

const saveExtractedTags = (tags) => {
    const filePath = path.resolve(__dirname, `./outputs/${settings.outputs.tags}`)
    if (!fs.existsSync(filePath)) {
        fs.outputFileSync(filePath, '')
    }
    fs.appendFile(filePath, tags.join('\n'), function (err) {
        if (err) throw err
    })
}

const extractTagsRecursively = (browser, currentPage, lastPage, resolve, reject) => {
    browser.clickLink('#tags_list > div.pager.fr > a:last-child', () => {
        if(browser.status === 200) {
            const tags = browser.queryAll('#tags-browser > div > a').map(element => browser.text(element))
            const percentage = Math.round(currentPage / lastPage * 100)
            saveExtractedTags(tags)
            console.log(`[${chalk.cyan(settings.url)}] extracted tags of page ${currentPage}/${lastPage} (P: ${chalk.cyan(percentage + '%')} T:${tags.length})`)
            if(currentPage === lastPage) {
                resolve()
            }
            try {
                extractTagsRecursively(browser, (currentPage + 1), lastPage, resolve, reject)
            } catch(error) {
                console.error(`[${chalk.cyan(settings.url)}] error extracting page ${chalk.orange((currentPage + 1))}/${lastPage}, trying again`)
                extractTagsRecursively(browser, (currentPage + 1), lastPage, resolve, reject)
            }
        } else {
            console.error(`[${chalk.cyan(settings.url)}] error loading page ${chalk.orange((currentPage))}/${lastPage} - ${chalk.red(browser.status)}`)
            reject(browser.status)
        }
    })
}

const extractTags = (browser) => {
    return new Promise((resolve, reject) => {
        browser.visit(makeCompleteUrl(settings.url, replaceHandle(settings.paths.tags, {name: 'page', value: 1})), () => {
            if(browser.status === 200) {
                const tagPages = Number(browser.text('#tags_list > div.pager.fr > a:nth-child(7) > span'))
                console.log(`[${chalk.cyan(settings.url)}] has ${chalk.cyan(tagPages)} pages with tag content`)
                extractTagsRecursively(browser, 1, tagPages, resolve, reject)
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
        extractTags(browser)
            .then((tags) => {
                console.log(`[${chalk.cyan(settings.url)}] extracted ${chalk.green('all')} tags`)
            }).catch(code => {
                console.error(`[${chalk.cyan(settings.url)}] responded with ${chalk.red(code)}`)
            })
    }).catch(code => {
        console.error(`[${chalk.cyan(settings.url)}] responded with ${chalk.red(code)}`)
    })

    // Keep node process alive "forever"
    setInterval(() => {}, 1 << 30)