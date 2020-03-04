
import { number, Record, string } from '@punchcard/shape';

import { Bool, rollback, savepoint, Sequence, Table, transaction } from '../lib';
import { Agg, Query } from '../lib/query';
import { sql } from '../lib/sql';

class User extends Record({
  userId: string,
  age: number
}) {}

class Friend extends Record({
  userId: string,
  friendId: string
}) {}

const UserTable = new Table({
  tableName: 'user',
  type: User,
  primaryKey: 'userId',
  indexes: [{
    fields: 'userId',
    where: _ => Bool.or(
      _.userId.equals('sam'),
      _.userId.like('sam%')
    )
  }]
});

const FriendsTable = new Table({
  tableName: 'friends',
  type: Friend,
});

const Seq = new Sequence({
  sequenceName: 'my_seq',
  start: 0,
  increment: 1
});

// select * from users where userId = 'userId'
UserTable.get({
  userId: 'userId'
});

// select age as a from users where age = 0
UserTable
  .where(_ => _.age.equals(0))
  .select(_ => ({a: _.user.age}));

// https://scala-slick.org/doc/3.1.1/queries.html

Query
  .from(UserTable)
  .where(_ => _.user.age.equals(0))
  .select(_ => ({
    age: _.user.age
  }));

/*
select user.userId, f.friendId, avg(users.age) as avg from users
join friends f on user.userId = f.friendId
where user.age = 0 & f.friendId like '%sam'
group by user.userId, f.friendId
*/
Query
  .from(UserTable)
  .join(FriendsTable, { as: 'f', on: _ => _.user.userId.equals(_.f.friendId) })
  .where(_ => Bool.and(
    _.user.age.equals(0),
    _.f.friendId.like('%sam')
  ))
  .groupBy(_ => [_.user.userId, _.f.friendId])
  .having(_ => Agg.avg(_.map(_ => _.user.age)).equals(0))
  .select(([userId, friendId], rows) => ({
    userId,
    friendId,
    avg: Agg.avg(rows.map(_ => _.user.age))
  }))
  ;

const t = sql`
select user.userId, avg(user.age) avg from ${UserTable} user
join ${FriendsTable} friends on user.userId = friends.userId
group by 1
having user.age = 0
order by 2 desc
`.as({
  userId: string,
  avg: number
});

UserTable
  .groupBy(_ => ({u: _.userId}))
  .select(_ => _);

const u = sql`select * from ${UserTable}`.as(User);

//

async function createUser() {
  const newUserId = await transaction(function*() {
    const {userId} = yield* UserTable.insert(new User({
      userId: 'userId',
      age: 1
    }), {
      returning: ['userId']
    });

    const sp1 = yield* savepoint('sp1');

    const user = yield* UserTable.get({
      userId
    });

    yield* FriendsTable.insert(new Friend({
      userId,
      friendId: 'friendId'
    }));

    if (userId === 'sam') {
      yield* rollback(sp1);
    }

    return userId;
  });
}