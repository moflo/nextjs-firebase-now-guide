### Firebase port of MySQL Database Guide

https://zeit.co/guides/deploying-next-and-mysql-with-now/
https://github.com/zeit/docs/blob/master/pages/guides/deploying-next-and-mysql-with-now.mdx

### MDX Guide
<details>

import Guide from '~/components/layout/guide'
import { TerminalInput } from '~/components/text/terminal'
import { InlineCode } from '~/components/text/code'
import { Image } from '~/components/media'
import Caption from '~/components/text/caption'
import Note from '~/components/text/note'
import { GenericLink } from '~/components/text/link'
import Card from '~/components/card'

export const meta = {
  title:
    'Create a Next.js Application With a Firebase Firestore That Builds and Deploys with Now',
  description:
    'How to deploy your Next.js and Firebase application with Now in a serverless environment',
  published: '2019-04-26T16:51:04.000Z',
  authors: ['moflo'],
  url: '/guides/deploying-next-and-firebase-with-now',
  image: `${
    process.env.ASSETS
  }/guides/deploying-next-firebase-with-now/deploying-next-firebase-with-now.png`,
  editUrl: 'pages/guides/deploying-next-firebase-with-now.mdx',
  lastEdited: '2019-04-27T21:46:17.000Z'
}

In this guide, we will walk you through creating and [deploying](/docs/v2/deployments/basics/) a [Next.js](https://nextjs.org/) app with the most popular open source database in the world, [MySQL](https://www.mysql.com/), on [ZEIT Now](/docs/v2).

[Next.js](https://nextjs.org/) from [ZEIT](https://zeit.co) is a production-ready framework that can help you create fast React applications. By using it along with Firebase, you can create a fast, modern web app that interacts with customer data in a performant manner.

We demonstrate the set up via an [example app](https://next-mysql.now.sh), that displays a paginated, gallery view of robot profiles, with individual profiles just a click away. The finished app can be found at <https://next-mysql.now.sh>.

<Image
  src={`${
    process.env.ASSETS
  }/guides/deploying-next-mysql-with-now/deploying-next-firebase-with-now.png`}
  width={650}
  height={380}
  oversize
/>

## Step 1: Populating Your MySQL Database

To use this guide, you will need to setup a remote Firestore database. You will need to set up your Firestore database on either [Google Cloud](https://cloud.google.com/firestore/) or on [Firebase](https://firebase.com/). As of this writing, only Firebase Firestore is offers a free trial.

<Note>Please read the trial terms and conditions carefully.</Note>

Once you have your Firestore database setup, you should make a note of your service account credentials:

- Database name
- Database URL
- Service Account JSON file

Using these credentials, you can connect to your database and insert the [example data](https://github.com/zeit/now-examples/blob/master/nextjs-mysql/db.sql) into a new table named `profiles`.

For brevity, we do not cover inserting records into a MySQL database. More information on doing this can be found in the [MySQL documentation](https://dev.mysql.com/doc/mysql-getting-started/en/#mysql-getting-started-connecting).

## Step 2: Set Up Your Project

Now that the database is populated, you can create a project directory and `cd` into it:

<TerminalInput>mkdir next-mysql && cd next-mysql</TerminalInput>
<Caption>
  Creating and entering into the <InlineCode>/next-mysql</InlineCode>{' '}directory.
</Caption>

Next, [initialize](https://yarnpkg.com/lang/en/docs/cli/init/) the project:

<TerminalInput>yarn init</TerminalInput>
<Caption>
  Initializing the project, this creates a <InlineCode>package.json</InlineCode>{' '}file.
</Caption>

Yarn will present some initial questions to set up your project, complete this and when done, add [`firebase-admin`](https://github.com/jeremydaly/serverless-mysql) and [`isomorphic-unfetch`](https://github.com/felixfbecker/node-sql-template-strings) as [dependencies](https://yarnpkg.com/en/docs/cli/add#toc-yarn-add):

<TerminalInput>yarn add serverless-mysql sql-template-strings</TerminalInput>
<Caption>
  Adding <InlineCode>serverless-mysql</InlineCode> and <InlineCode>sql-template-strings</InlineCode> as <GenericLink href="https://yarnpkg.com/lang/en/docs/installing-dependencies/">dependencies</GenericLink> to the project.
</Caption>

Adding [`firebase-admin`](https://github.com/jeremydaly/serverless-mysql) to the project demonstrates one method of using a serverless function to access the Firestore database and is used in the `index.js` function.

Adding [`isomorphic-unfetch`](https://github.com/jeremydaly/serverless-mysql) to the project demonstrates a second method of using a serverless function to access the Firestore database via isomorphic fetch and is used in the `profile.js` function.


Now, add your database credentials from [step 1](#step-1:-populating-your-mysql-database) to the project as [secrets](/docs/v2/deployments/environment-variables-and-secrets#securing-environment-variables-using-secrets) using the [Now CLI](/download#now-cli) to keep them secure:

<TerminalInput>
  now secrets add FIREBASE_HOST $database-hostname 
</TerminalInput>
<Caption>
  Adding <GenericLink href="/v2/deployments/environment-variables-and-secrets#securing-environment-variables-using-secrets">secrets</GenericLink> to the project.
</Caption>

## Step 3: Create Your Reusable Database Connection

To ensure all your MySQL connections are managed by [`serverless-mysql`](https://github.com/jeremydaly/serverless-mysql), you should create a helper function to form the connection each time.

Create a `/lib` directory with a `db.js` file inside:

<TerminalInput>mkdir lib</TerminalInput>
<Caption>
  Creating a <InlineCode>/lib</InlineCode>{' '}directory.
</Caption>

Add the following code to `db.js`:

```js
const mysql = require('serverless-mysql')

const db = mysql({
  config: {
    host: process.env.MYSQL_HOST,
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD
  }
})

exports.query = async query => {
  try {
    const results = await db.query(query)
    await db.end()
    return results
  } catch (error) {
    return { error }
  }
}
```

<Caption>
  An example <InlineCode>db.js</InlineCode> file for your project.
</Caption>

Your `db.js` file performs the following functions:

- Creates a connection to your MySQL database using credentials defined as [secrets](/docs/v2/deployments/environment-variables-and-secrets#securing-environment-variables-using-secrets)
- Exports a function that ensures connections are closed once the query has resolved

<Note>
  The most important line is <InlineCode>await db.end()</InlineCode>. This
  prevents your app from exhausting all available connections.
</Note>

Now you have a reusable database connection, perfectly suited for a [serverless](/docs/v2/deployments/concepts/lambdas/) environment.

## Step 4: Creating Your Node.js API

The next step is to create your API. Start off by creating an `/api` directory with a `/profiles` directory inside:

<TerminalInput>
  mkdir api && mkdir api/profiles
</TerminalInput>
<Caption>
  Creating an <InlineCode>/api</InlineCode> directory with a <InlineCode>/profiles</InlineCode> directory inside it.
</Caption>

Inside your `/profiles` directory create an `index.js` file with the following code:

```js
const db = require('../../lib/db')
const escape = require('sql-template-strings')
const url = require('url')

module.exports = async (req, res) => {
  const { query } = url.parse(req.url, true)
  let page = parseInt(query.page) || 1
  const limit = parseInt(query.limit) || 9
  if (page < 1) page = 1
  const profiles = await db.query(escape`
      SELECT *
      FROM profiles
      ORDER BY id
      LIMIT ${(page - 1) * limit}, ${limit}
    `)
  const count = await db.query(escape`
      SELECT COUNT(*)
      AS profilesCount
      FROM profiles
    `)
  const { profilesCount } = count[0]
  const pageCount = Math.ceil(profilesCount / limit)
  res.end(JSON.stringify({ profiles, pageCount, page }))
}
```

<Caption>
  An example <InlineCode>index.js</InlineCode> file for your project.
</Caption>

Your `index.js` file performs the following functions:

- Parses the request query parameters
- Uses the query parameters to determine which profiles are required
- Requests **only** the required profiles from the database
- Queries the database to get the total records
- Uses the records count to calculate pagination
- Sends the retrieved profiles and pagination details as a response

That is all the API code required to successfully use pagination in a [serverless](/docs/v2/deployments/concepts/lambdas/) environment.

Next, create a `profile.js` file in your `/profiles` directory containing the code below:

```js
const db = require('../../lib/db')
const escape = require('sql-template-strings')
const url = require('url')

module.exports = async (req, res) => {
  const { query } = url.parse(req.url, true)
  const [profile] = await db.query(escape`
    SELECT *
    FROM profiles
    WHERE id = ${query.id}
  `)
  res.end(JSON.stringify({ profile }))
}
```

<Caption>
  An example <InlineCode>profile.js</InlineCode> file for your project.
</Caption>

Your `profile.js` file performs the following functions:

- Parses the request query parameter
- Uses the query parameter to select a single profile from the database
- Sends the retrieved profile as a response

You now have an API that will give you either all profiles or just a single one, dependent on the [route](/docs/v2/deployments/routes/). You now need to create the application interface to display them.

## Step 5: Creating Your Next.js Client

To add [Next.js]() to your project, you should install the following [dependencies](https://yarnpkg.com/lang/en/docs/installing-dependencies/):

<TerminalInput>
  yarn add isomorphic-unfetch next react react-dom
</TerminalInput>
<Caption>
  Adding multiple dependencies to the project.
</Caption>

Next, create a `/pages` directory like so:

<TerminalInput>
  mkdir pages
</TerminalInput>
<Caption>
  Creating a <InlineCode>/pages</InlineCode> directory.
</Caption>

Now you should create an `index.js` file inside your `/pages` directory with the following code:

```jsx
import fetch from 'isomorphic-unfetch'
import Link from 'next/link'

HomePage.getInitialProps = async ({ req, query }) => {
  const protocol = req
    ? `${req.headers['x-forwarded-proto']}:`
    : location.protocol
  const host = req ? req.headers['x-forwarded-host'] : location.host
  const pageRequest = `${protocol}//${host}/api/profiles?page=${query.page ||
    1}&limit=${query.limit || 9}`
  const res = await fetch(pageRequest)
  const json = await res.json()
  return json
}

function HomePage({ profiles, page, pageCount }) {
  return (
    <>
      <ul>
        {profiles.map(p => (
          <li className="profile" key={p.id}>
            <Link prefetch href={`/profile?id=${p.id}`}>
              <a>
                <img src={p.avatar} />
                <span>{p.name}</span>
              </a>
            </Link>
          </li>
        ))}
      </ul>
      <nav>
        {page > 1 && (
          <Link prefetch href={`/?page=${page - 1}&limit=9`}>
            <a>Previous</a>
          </Link>
        )}
        {page < pageCount && (
          <Link prefetch href={`/?page=${page + 1}&limit=9`}>
            <a className="next">Next</a>
          </Link>
        )}
      </nav>
    </>
  )
}

export default HomePage
```

<Caption>
  An example <InlineCode>pages/index.js</InlineCode> file for your project.
</Caption>

<Note>
  This is an extract, the full code for this file can be found in the{' '}
  <GenericLink href="https://github.com/zeit/now-examples/blob/master/nextjs-mysql/pages/index.js">
    example repository
  </GenericLink>
  .
</Note>

Your `pages/index.js` file performs the following functions:

- Checks whether the request is being made from the server or client side
- Makes a request to the API for profiles using query parameters
- Receives the profiles and pagination data, making them available as props
- Lists the profiles in a gallery view
- Uses the pagination data to create navigation buttons

The next page you should create in the `/pages` directory is `profile.js`, this will render a more detailed view of an individual profile:

```jsx
import fetch from 'isomorphic-unfetch'
import Link from 'next/link'

ProfilePage.getInitialProps = async ({ req, query }) => {
  const protocol = req
    ? `${req.headers['x-forwarded-proto']}:`
    : location.protocol
  const host = req ? req.headers['x-forwarded-host'] : location.host
  const pageRequest = `${protocol}//${host}/api/profiles/${query.id}`
  const res = await fetch(pageRequest)
  const json = await res.json()
  return json
}

function ProfilePage({ profile }) {
  return (
    <>
      <div>
        <img src={profile.avatar} />
        <h1>{profile.name}</h1>
        <p>{profile.address}</p>
        <p>{profile.email}</p>
        <Link prefetch href="/">
          <a>← Back to profiles</a>
        </Link>
      </div>
    </>
  )
}

export default ProfilePage
```

<Caption>
  An example <InlineCode>pages/profile.js</InlineCode> file for your project.
</Caption>

<Note>
  This is an extract, the full code for this file can be found in the{' '}
  <GenericLink href="https://github.com/zeit/now-examples/blob/master/nextjs-mysql/pages/profile.js">
    example repository
  </GenericLink>
  .
</Note>

Your `pages/index.js` file performs the following functions:

- Checks whether the request is being made from the server or client side
- Makes a request to the API for a single profile using a query parameter
- Receives the profile data, making it available as a prop
- Displays the profile with an option to go back to the gallery

You now have a **complete application** with both an API and interface, the next section will show you how to deploy it seamlessly with [Now](/docs/v2/getting-started/introduction-to-now).

## Step 6: Deploy Your Project with Now

Getting your project ready to [deploy](/docs/v2/deployments/basics/) with [Now](/docs/v2/getting-started/introduction-to-now) could hardly be simpler, first you should create [`next.config.js` file](https://nextjs.org/docs#custom-configuration) in your root directory with the following code:

```js
module.exports = {
  target: 'serverless'
}
```

<Caption>
  An example <InlineCode>next.config.js</InlineCode> file for your project.
</Caption>

The purpose of this [file](https://nextjs.org/docs#custom-configuration) is to tell Next to build for a serverless environment, only 3 lines of code are needed!

The last file you should create is a [`now.json` file](/docs/v2/deployments/configuration). This will bring your project together with just a few lines of code before [deployment](/docs/v2/deployments/basics/). Create one with the following code:

```json
{
  "version": 2,
  "name": "next-mysql",
  "alias": "next-mysql.now.sh",
  "builds": [
    { "src": "api/**/*.js", "use": "@now/node" },
    { "src": "next.config.js", "use": "@now/next" }
  ],
  "routes": [
    {
      "src": "/api/profiles/(?<id>[^/]*)",
      "dest": "api/profiles/profile.js?id=$id"
    }
  ],
  "env": {
    "MYSQL_HOST": "@mysql_host",
    "MYSQL_USER": "@mysql_user",
    "MYSQL_PASSWORD": "@mysql_password",
    "MYSQL_DATABASE": "@mysql_database"
  }
}
```

<Caption>
  An example <InlineCode>now.json</InlineCode> file for your project.
</Caption>

The [`now.json` file](/docs/v2/deployments/configuration) allows you to achieve many things with your [deployment](/docs/v2/deployments/basics/). Below is a description of what each property does:

- [`version`](/docs/v2/deployments/configuration/#version) ensures you are using the latest [Now 2.0 platform](/docs/v2/platform/overview) version
- [`name`](/docs/v2/deployments/configuration/#name) defines a project [name](/docs/v2/deployments/configuration/#name) your deployment will be known by under Now
- [`alias`](/docs/v2/deployments/configuration/#alias) allows you to set an alias that can be [used in production](/docs/v2/domains-and-aliases/aliasing-a-deployment/)
- [`builds`](/docs/v2/deployments/configuration/#builds) instructs Now to use the [`@now/node`](/docs/v2/deployments/official-builders/node-js-now-node/) and [`@now/next`](/docs/v2/deployments/official-builders/next-js-now-next/) [builders](/docs/v2/deployments/builders/overview/) for your applications API and interface respectively
- [`routes`](/docs/v2/deployments/configuration/#routes) routes individual profile requests to the correct function, with the id parameter
- [`env`](/docs/v2/deployments/configuration/#env) injects defined secrets into the app, exposing them as [environment variables](/docs/v2/deployments/environment-variables-and-secrets#from-now.json)

<br />

Finally, deploy the application with [Now](/docs/v2/getting-started/introduction-to-now).

If you have not yet installed Now, you can do so by installing the [Now Desktop app](/docs/v2/getting-started/installation/#now-desktop) which installs Now CLI automatically, or by [installing Now CLI](/docs/v2/getting-started/installation/#now-cli) directly.

[Now](/docs/v2/getting-started/introduction-to-now) allows you to [deploy your project](/docs/v2/deployments/basics) from the terminal with just one command:

<TerminalInput>now</TerminalInput>
<Caption>
  Deploying an application with Now using only one command.
</Caption>

You will see a short build step in your terminal followed by the news that your project has been [deployed](https://zeit.co/docs/v2/deployments/basics/), it should look similar to this: <https://next-mysql.now.sh/>

## Resources

For more information on working with [MySQL](https://www.mysql.com/) and [Next.js](https://nextjs.org/), please refer to their documentation.

To configure [Now](/docs/v2/getting-started/introduction-to-now) further, please see these additional topics and guides:

<Card title="Deploying Basics" href="/docs/v2/deployments/basics">
  Deploy any of your applications with ZEIT Now.
</Card>

<Card
  title="Aliasing"
  href="/docs/v2/domains-and-aliases/aliasing-a-deployment/"
>
  Learn more about aliasing to your deployments.
</Card>

<Card title="www. Redirect" href="/guides/redirect-from-www">
  Create a redirect from the www. subdomain to your naked domain.
</Card>

<Card title="More Guides" href="/guides">
  See more guides that help you move forward with your projects and deployments.
</Card>

export default ({ children }) => <Guide meta={meta}>{children}</Guide>


</details>