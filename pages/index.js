import fetch from "isomorphic-unfetch";
import Head from "next/head";
import Link from "next/link";

HomePage.getInitialProps = async ({ req, query }) => {
  const protocol = req
    ? `${req.headers["x-forwarded-proto"]}:`
    : location.protocol;
  const host = req ? req.headers["x-forwarded-host"] : location.host;
  const pageRequest = `${protocol}//${host}/api/profiles?page=${query.page ||
    1}&limit=${query.limit || 9}`;
  const res = await fetch(pageRequest);
  const json = await res.json();
  return json;
};

function HomePage({ profiles, page, pageCount }) {
  return (
    <>
      <Head>
        <title>Serverless Firebase on ZEIT Now - Profiles</title>
        <link
          rel="stylesheet"
          href="https://css.zeit.sh/v1.css"
          type="text/css"
        />
      </Head>
      <header>
        <h1>Serverless Firebase Application</h1>
        <h2>Robot Profiles</h2>
        <p>
          This website is a collection of robot profiles, loaded from a Node.js
          API that pulls data from Firebase and returns it as JSON, ready for
          pagination.
        </p>
      </header>
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
      <style jsx>{`
        ul {
          display: flex;
          flex-flow: row wrap;
          margin: 0px 0px 32px;
        }
        ul li::before {
          content: "";
        }
        li {
          display: flex;
        }
        h1 {
          margin-bottom: 16px;
        }
        h2 {
          margin-top: 16px;
        }
        header {
          margin-bottom: 32px;
          text-align: center;
        }
        img {
          width: 80px;
          height: 80px;
          margin-bottom: 16px;
        }
        nav {
          display: flex;
          justify-content: space-between;
        }
        span {
          color: #000;
        }
        .profile {
          width: calc(33.333% - 10.666px);
          min-width: 100px;
          box-shadow: rgba(0, 0, 0, 0.1) 0px 6px 12px;
          margin-bottom: 16px;
          border-radius: 12px;
          transition: transform 0.12s ease 0s;
        }
        .profile a {
          display: flex;
          flex-direction: column;
          -webkit-box-align: center;
          align-items: center;
          border-bottom: 0px;
          padding: 16px;
          width: 100%;
        }
        .profile:not(:nth-child(3n + 3)) {
          margin-right: 16px;
        }
        .next {
          margin-left: auto;
        }
      `}</style>
    </>
  );
}

export default HomePage;
