import assert from 'assert'
import MongoQueries from '../../src/mongo/MongoQueries'

describe('MongoQueries', () => {
  it('should return all selector', () => {
    let dbQueries = new MongoQueries()
    let allSelector = dbQueries.getAllSelector()
    assert.equal(JSON.stringify(allSelector), '{}')
  })
})
