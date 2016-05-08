import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList } from 'graphql'

function createSchema (resolve) {
  let Story = new GraphQLObjectType({
    name: 'Story',
    fields: () => ({
      id: {
        type: GraphQLString
      },
      text: {
        type: GraphQLString
      },
      author: {
        type: GraphQLString,
        resolve (parent) {
          let { userId } = parent
          if (!userId) return
          return resolve('users', userId)
        }
      }
    })
  })

  let User = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
      id: {
        type: GraphQLString
      },
      name: {
        type: GraphQLString
      },
      stories: {
        type: new GraphQLList(Story),
        resolve (parent, args) {
          return resolve('stories', {userId: parent.id})
        }
      }
    })
  })

  let RootType = new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      user: {
        type: User,
        args: {
          id: { type: GraphQLString }
        },
        resolve: (parent, args) => {
          let { id } = args
          return resolve('users', id)
        }
      },
      story: {
        type: Story,
        args: {
          id: { type: GraphQLString }
        },
        resolve: (parent, args) => {
          let { id } = args
          return resolve('stories', id)
        }
      }
    })
  })

  let schema = new GraphQLSchema({
    query: RootType
  })

  return schema
}

export default createSchema
