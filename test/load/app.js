import express from 'express'
import store from './store'

let app = express()

app.use(store.modelMiddleware())

export default app
