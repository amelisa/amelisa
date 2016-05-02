import MemoryStorage from '../../src/mongo/MemoryStorage'
import { shouldBehaveLikeMongoQueriesStorage } from './mongoqueriesstorage'

describe('MemoryStorage', function () {
  before(async () => {
    this.storage = new MemoryStorage()
  })

  shouldBehaveLikeMongoQueriesStorage.bind(this)()
})
