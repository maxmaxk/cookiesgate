const express = require('express')
const axios = require('axios')

const port = Number(process.env.PORT) || 9001
const baseURL = process.env.BACK_URL || 'http://127.0.0.1:3000'
// 'http://hermes.17bit.online/unf_iviback/hs'
const timeout = Number(process.env.BACK_TIMEOUT) || 20000
const basicToken = process.env.BASIC_TOKEN || 'QXV0aFNlcnZpY2U6VGEyeHk4Ynk='
const cookieMaxAge = Number(process.env.COOKIE_MAX_AGE) || 3600
const domainName = process.env.DOMAIN_NAME || 'test.zakaz-ivi.online'

const app = express()

const instance = axios.create({
  baseURL,
  timeout
});

const demoOrAuthRegexp = /\/([a-zA-Z0-9:.-]+)\/(demo|api\/auth)\/(.*)$/g

app.all(demoOrAuthRegexp, (req, _res, next) => {
  req.headers = {...req.headers, 'Authorization': `Basic ${basicToken}`}
  next()
})

app.all('*', (req, res, _next) => {
  instance({
    method: req.method,
    url: req.url,
    headers: req.headers,
    data: req.data,
    responseType: req.responseType
  })
  .then(backRes => {
    console.log('backRes.url=', backRes.config.url)
    try {
      res.setHeaders(modifyHeaders(req, backRes))
      res.status(backRes.status)
      res.send(backRes.data)
    } catch (err) {
      console.log(`Error on request: ${err}`)
    }
  })
  .catch(err => {
    console.log(`Error: ${err.message}`)
    res.writeHead(503).end()
  })
})

const modifyHeaders = (req, backRes) => {
  if (isLogin(req.url)){
    setCookie(backRes)
  } else if (isLogout(req.url) || isBadAnswer(backRes)){
    resetCookie(backRes)
  } else {
    prolongCookie(req, backRes)
  }
  return new Map(backRes.headers)
}

const isLogin = url => /\/([a-zA-Z0-9:.-]+)\/sIVI\/User\/login\/(.*)$/g.test(url)
const isLogout = url => /\/([a-zA-Z0-9:.-]+)\/sIVI\/User\/logout\/(.*)$/g.test(url)
const isBadAnswer = (backRes) => {
  // TODO: add check for text description
  return backRes.status === 404
}

const setCookie = backRes => {
  const sessionId = getSessionId(backRes)
  setCookieHeader(sessionId, backRes)
}

const getSessionId = backRes => {
  const cookie = backRes.headers['Set-Cookie']
  if (!cookie) return undefined
  return cookie.split(';').find(param => param.split('=')[0] === 'ibsession')?.split('=')[1]
}

const setCookieHeader = (sessionId, backRes) => {
  if (!sessionId) return
  backRes.headers['Set-Cookie'] = `ibsession=${sessionId}; Path=/; domain=${domainName}; Expires=${getExpires()}; Secure; HttpOnly; SameSite=None`
}

const resetCookie = backRes => {
  backRes.headers['Set-Cookie'] = `ibsession=deleted; Path=/; domain=${domainName}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=None` 
}

const prolongCookie = (req, backRes) => {
  const sessionId = getSessionId(req)
  setCookieHeader(sessionId, backRes)
}

const getExpires = () => new Date(Date.now() + cookieMaxAge * 1000).toUTCString()

app.listen(port, () => {
  console.log(`Gate listening on port ${port}`)
})
