import assert from 'assert';
import MongoQueries from '../lib/MongoQueries';

describe('MongoQueries', () => {

  it('should return all selector', () => {
    let allSelector = MongoQueries.allSelector
    assert.equal(JSON.stringify(allSelector), '{}');
  });
});
