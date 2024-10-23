const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dbPath = path.join(__dirname, 'transactions.db')

const app = express()
app.use(express.json())

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3001, () => {
      console.log('Server Running at http://localhost:3001/')
    })
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(-1)
  }
}

initializeDBAndServer()

//user Token authentication using middleware function to check user authentication every time we do operations with database //

const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

//user LOGIN to check  whether the user valid(registered) user or not//

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

// jwt token has not generated its raised an error 404//

//post: add new transaction to transaction table//

app.post('/transactions/', authenticateToken, async (request, response) => {
  const {id, type, category, amount, date, description} = request.body

  const createTransaction = `INSERT INTO transactions(id, type, category, amount, date, description)
    VALUES(${id},'${type}','${category}', ${amount}, '${date}', '${description}');`
  await db.run(createTransaction)
  response.send('Transaction Successfully Added')
})

//get all transactions//

app.get('/transactions/', authenticateToken, async (request, response) => {
  const getAllTransactions = `SELECT * FROM transactions`
  const result = await db.get(getAllTransactions)
  response.send(result)
})

//get specific transaction based on id//

app.get('/transactions/:id/', authenticateToken, async (request, response) => {
  const {id} = request.params

  const getAllTransactions = `SELECT * FROM transactions WHERE id=${id}`

  const result = await db.get(getAllTransactions)
  response.send(result)
})

//Update a existing transaction based on id: specific transaction//

app.put('/transactions/:id/', authenticateToken, async (request, response) => {
  const {transactionId} = request.params

  const {id, type, category, amount, date, description} = request.body
  const updateTransaction = `INSERT INTO transactions(id, type, category, amount, date, description)
    VALUES(${id}, '${type},'${category}', ${amount}, '${date}', '${description}') WHERE id=${transactionId}; `
  await db.run(updateTransaction)
  response.send('Transaction Updated')
})

//DELETE transaction based on given id//

app.delete(
  'transactions/:id/',
  authenticateToken,
  async (request, response) => {
    const {id} = request.params
    const deleteTransaction = `DELETE FROM transactions WHERE id= ${id};`
    await db.run(deleteTransaction)
  },
)

module.exports = app
