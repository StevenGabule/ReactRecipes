const express = require('express');
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: 'variables.env'});

const Recipe = require('./models/Recipe');
const User = require('./models/User');

const {graphiqlExpress, graphqlExpress} = require('apollo-server-express');
const {makeExecutableSchema} = require('graphql-tools');

const {typeDefs} = require('./schema');
const {resolvers} = require('./resolvers');

const schema = makeExecutableSchema({
    typeDefs,
    resolvers
});

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('DB CONNECTED'))
    .catch(err => console.error(err));

const app = express();

const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true
};

app.use(cors(corsOptions));

// set up jwt authentication middleware
app.use(async (req, res, next) => {
    const token = req.headers["authorization"];
    if (token !== "null") {
        try {
            req.currentUser = await jwt.verify(token, process.env.SECRET);
        } catch (e) {
            console.error(e)
        }
    }
    next();
});


// create graphiql application
// app.use("/graphiql", graphiqlExpress({endpointURL: "/graphql"}));

// connect schemas with graphql
app.use("/graphql", bodyParser.json(), graphqlExpress(({currentUser}) => ({
        schema,
        context: {
            Recipe,
            User,
            currentUser
        }
    }))
);

if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    });
}

const PORT = process.env.PORT || 4444;
app.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`)
});