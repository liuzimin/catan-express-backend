/*jshint esversion: 6*/
const express = require('express');
// const cookiesMiddleware = require('universal-cookie-express');
const firebase = require('firebase');
const admin = require('firebase-admin');
const app = express();
const cors = require('cors');
const socket = require('socket.io');
const session = require('express-session');
const fs = require('fs');
const boardFunctions = require('./board.js');
const serviceAccount = require('./c09-project-firebase-adminsdk-xuxa7-da3b397950.json');
// cookieParser = require('cookie-parser');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

app.use(express.static('build'));

// app.use(cookiesMiddleware()).use(function (req, res) {
//     req.universalCookies.set('user', "user123")
//     console.log("cookie: ", req.universalCookies.get('user'))

// })

// app.use(cookieParser());

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://c09-project.firebaseio.com'
})

let config = {
    apiKey: "AIzaSyBjLtituCAs6A4xhtoiwMRZBAMnxVAT_Wg",
    authDomain: "c09-project.firebaseapp.com",
    serviceAccount: "./c09-project-firebase-adminsdk-xuxa7-da3b397950.json",
    databaseURL: "https://c09-project.firebaseio.com",
    projectId: "c09-project",
    storageBucket: "c09-project.appspot.com",
    messagingSenderId: "472213379563"
};
firebase.initializeApp(config);



let ref = firebase.database().ref().child('c09-project');
let gameStateRef = ref.child('gameState');



app.use(session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: true
}))

const cookie = require('cookie');

app.use(function (req, res, next) {
    // let cookies = cookie.parse(req.headers.cookie || '');
    req.user = ('user' in req.session) ? req.session.user : null;
    req.uid = ('uid' in req.session) ? req.session.uid : null;
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

let isAuthenticated = function (req, res, next) {
    if (!req.session.user) return res.status(401).end("access denied");
    next();
}

app.post('/signIn', function (req, res, next) {
    // console.log("cookie: ", req.universalCookies.get('user'))
    console.log('hello')
    let resObj = {
        error: null,
        uid: null,
        idToken: null,
        idTokenExpiryDate: null,
        username: null
    }

    firebase.auth().signInWithEmailAndPassword(req.body.email, req.body.password).then(user => {
        admin.auth().getUserByEmail(req.body.email)
            .then(function (userRecord) {
                // See the UserRecord reference doc for the contents of userRecord.
                console.log('Successfully fetched user data:', userRecord.toJSON());
                resObj.idTokenExpiryDate = userRecord.tokensValidAfterTime;
                resObj.username = userRecord.displayName;
                resObj.uid = userRecord.uid;
                admin.auth().createCustomToken(userRecord.uid).then(function (token) {
                    resObj.idToken = token;
                    // res.setHeader('Set-Cookie', cookie.serialize('user', JSON.stringify({ uid: resObj.uid, username: resObj.username }), {
                    //     path: '/',
                    //     maxAge: 60 * 60 * 24 * 7
                    // }));
                    // console.log('res: ', res.getHeaders()['set-cookie'])
                    req.session.uid = resObj.uid;
                    req.session.user = resObj.username;
                    // console.log('resObj: ', resObj)
                    // return res.cookie('name', 'myName').json('cookie set');

                    return res.json(resObj);
                })
                    .catch(function (error) {
                        console.log(error)
                        res.json({
                            error: 'INVALID_PASSWORD'
                        });
                    })
            })
            .catch(function (error) {
                console.log('Error fetching user data:', error);
            });
    }).catch(function (err) {
        console.log('INVALID_PASSWORD')
        res.json({
            error: 'INVALID_PASSWORD'
        });
    })


    // admin.auth().getUserByEmail(req.body.email)
    // .then(function(userRecord) {
    //   // See the UserRecord reference doc for the contents of userRecord.
    //   console.log('Successfully fetched user data:', userRecord.toJSON());
    //   resObj.idTokenExpiryDate = userRecord.tokensValidAfterTime;
    //   resObj.username = userRecord.displayName;
    //   resObj.uid = userRecord.uid;
    //   admin.auth().createCustomToken(userRecord.uid).then(function(token) {
    //     resObj.idToken = token;
    //     res.setHeader('Set-Cookie', cookie.serialize('user', JSON.stringify({uid: resObj.uid, username: resObj.username }), {
    //         path : '/', 
    //         maxAge: 60 * 60 * 24 * 7
    //     }));
    //     // console.log('res: ', res.getHeaders()['set-cookie'])
    //     req.session.uid = resObj.uid;
    //     req.session.user = resObj.username;
    //     // console.log('resObj: ', resObj)
    //     return res.json(resObj);
    //   })
    //   .catch(function(error) {
    //     console.log(error)
    //   })
    // })
    // .catch(function(error) {
    //  console.log('Error fetching user data:', error);
    // });

});

app.post('/signUp', function (req, res, next) {
    admin.auth().createUser({
        email: req.body.email,
        emailVerified: false,
        password: req.body.password,
        displayName: req.body.email.substring(0, req.body.email.indexOf("@"))
    })
        .then(function (userRecord) {
            console.log('Successfully created new user: ', userRecord.uid);
            res.send({ error: null });
        })
        .catch(function (error) {
            console.log('Error creating user: ', error)
            res.json({
                error: 'SIGN_UP_FAILED'
            });
        })

});

app.post('/signOut', function (req, res, next) {
    req.session.user = null;
    res.setHeader('Set-Cookie', cookie.serialize('user', '', {
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
})

app.get('/getRooms', function (req, res) {
    let error = false
    if (error) {
        res.status(500);
        res.json({
            error: 'GET_ROOMS_FAILED',
        });
    }
    res.json({
        error: null,
        rooms: [
            { name: 'room1', numPlayers: 3, maxPlayers: 4 },
            { name: 'room2nameisawesome1', numPlayers: 1, maxPlayers: 4 },
            { name: 'room13', numPlayers: 4, maxPlayers: 4 },
            { name: 'room111', numPlayers: 3, maxPlayers: 4 },
            { name: 'room2nameisawesome2', numPlayers: 1, maxPlayers: 4 },
            { name: 'room11111', numPlayers: 3, maxPlayers: 4 },
            { name: 'room2nameisawesome3', numPlayers: 1, maxPlayers: 4 },
            { name: 'room1222', numPlayers: 3, maxPlayers: 4 },
            { name: 'room2nameisawesome4', numPlayers: 1, maxPlayers: 4 },
            { name: 'room12', numPlayers: 3, maxPlayers: 4 },
            { name: 'room2nameisawesome5', numPlayers: 1, maxPlayers: 4 },
            { name: 'room31', numPlayers: 3, maxPlayers: 4 },
            { name: 'room2nameisawesome6', numPlayers: 1, maxPlayers: 4 },
            { name: 'room145', numPlayers: 3, maxPlayers: 4 },
            { name: 'room2nameisawesome7', numPlayers: 1, maxPlayers: 4 },
            { name: 'room1565', numPlayers: 3, maxPlayers: 4 },
            { name: 'room2nameisawesome8', numPlayers: 1, maxPlayers: 4 },
            { name: 'room67671', numPlayers: 3, maxPlayers: 4 },
            { name: 'room2nameisawesome9', numPlayers: 1, maxPlayers: 4 },
            { name: 'room165746', numPlayers: 3, maxPlayers: 4 },
            { name: 'room2nameisawesome10', numPlayers: 1, maxPlayers: 4 },
            { name: 'room1435634', numPlayers: 3, maxPlayers: 4 },
            { name: 'room2nameisawesome11', numPlayers: 1, maxPlayers: 4 },
        ]
    })
});

let GameState = (function (state) {
    return {
        gameName: state.gameName,
        players: state.players,
        hexes: state.hexes,
        roads: [],
        settlements: [],
        cities: [],
        setupRoad: 0,
        setupSettlement: 0,
        currentLargestArmy: 0,
        currentLongestRoad: 0,
        currentPlayerNum: 0,
        maxPlayerNum: state.maxPlayers,
        currentTurn: null,
        turnPhase: 'game not started',
        gameOver: false,
        winner: null
    }
})

let playerId = 0;
let Player = (function (playerName) {
    return {
        _id: playerId++,
        username: playerName,
        resources: {
            Wood: 0,
            Sheep: 0,
            Ore: 0,
            Brick: 0,
            Wheat: 0
        },
        devCards: {
            Knight: 0,
            VictoryPointCard: 0,
            RoadBuilding: 0,
            Monopoly: 0,
            YearOfPlenty: 0
        },
        settlementCount: 0,
        knightsPlayed: 0,
        VictoryPoints: 0,
        LongestRoadLength: 0,
        OwnsLargestArmy: false,
        OwnsLongestRoad: false,
        OwnsSheepPort: false,
        OwnsWoodPort: false,
        OwnsOrePort: false,
        OwnsBrickPort: false,
        OwnsWheatPort: false,
        Owns3For1Port: false,
    }
});

let Road = (function (road) {
    return {
        player: road.player,
        startPoint: road.start,
        endPoint: road.end,
    }
});

let Settlement = (function (settlement) {
    return {
        player: settlement.player,
        location: settlement.location,
    }
});

let City = (function (city) {
    return {
        player: city.player,
        location: city.location,
    }
});

function getPlayerByID(playerID, gameState) {
    return gameState.players[playerID]
}


const https = require('https');
const PORT = 3000;

// const httpsOptions = {
//     key: fs.readFileSync('./securityDev/cert.key'),
//     cert: fs.readFileSync('./securityDev/cert.pem')
// }

// const server = https.createServer(httpsOptions, app)
//     .listen(PORT, () => {
//         console.log('server running at ' + PORT)
//     })

let server = app.listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});

let io = socket(server);

io.on('connection', function (socket) {
    console.log('socket connection successful');

    socket.on('PLAYER_CONNECT', (req) => {

        // create game room
        if (req.string == 'room_setup') {
            let gameName = req.gameName;
            playerId = 0
            // add the host
            let players = [];
            let host = new Player(req.username);
            players.push(host);

            // set up board
            let hexes = boardFunctions.setupHexes();

            let gameState = new GameState({ gameName: gameName, players: players, hexes: hexes, maxPlayers: players.length });
            let id = gameStateRef.push(JSON.stringify(gameState)).key;
            gameStateRef.child(id).once('value').then(function (snapshot) {
                let gameState = JSON.parse(snapshot.val());
                gameState._id = id;
                io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));
            })

        }

        if (req.string == 'get_game_state') {
            let id = req.gameStateId;
            gameStateRef.child(id).once('value').then(function (snapshot) {
                io.sockets.emit('PLAYER_CONNECT', JSON.stringify(snapshot.val()));
            })
        }

        // new player joins
        if (req.string == 'player_join') {
            let newPlayer = new Player(req.username);

            // FOR PROD:
            // newPlayer._id = req.session.uid;

            let id = req.gameStateId;
            gameStateRef.child(id).once('value').then(function (snapshot) {
                let gameState = JSON.parse(snapshot.val());
                gameState.players.push(newPlayer);
                gameState.maxPlayerNum++;
                // store game state
                gameStateRef.child(id).set(JSON.stringify(gameState), function (err) {
                    if (err) io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));
                })
            })
                .catch(function (err) {
                    console.log(err);
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                })

        }

        // game starts
        if (req.string == 'start_game') {
            let id = req.gameStateId
            gameStateRef.child(id).once('value').then(function (snapshot) {
                let gameState = JSON.parse(snapshot.val());
                gameState.currentTurn = gameState.players[gameState.currentPlayerNum];
                gameState.turnPhase = 'setup_placement';
                gameStateRef.child(id).set(JSON.stringify(gameState), function (err) {
                    if (err) io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));
                })
            })
                .catch(function (err) {
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                })


        }

        // ends current player's turn and goes to the next player
        if (req.string == 'end_turn') {
            let id = req.gameStateId;
            gameStateRef.child(id).once('value').then(function (snapshot) {
                let gameState = JSON.parse(snapshot.val());

                if (gameState.turnPhase == 'setup_placement') io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));

                gameState = boardFunctions.advanceToNextTurn(gameState);

                // store game state
                gameStateRef.child(id).set(JSON.stringify(gameState), function (err) {
                    if (err) io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));
                })
            })
                .catch(function (err) {
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                })


        }

        // Dice roll (7)
        if (req.string == 'seven_roll') {
            let id = req.gameStateId;
            gameStateRef.child(id).once('value').then(function (snapshot) {
                let gameState = JSON.parse(snapshot.val());
                gameState.turnPhase = 'move_robber';
                // store game state
                gameStateRef.child(id).set(JSON.stringify(gameState), function (err) {
                    if (err) io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));
                })
            })
                .catch(function (err) {
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                })
        }

        // move the robber to the new hex
        if (req.string == 'move_robber') {
            let id = req.gameStateId;
            gameStateRef.child(id).once('value').then(function (snapshot) {
                let gameState = JSON.parse(snapshot.val());
                let newRobberHex = req.robberPosition;
                // remove robber from previous location
                let previousHex = gameState.hexes.find(hex => {
                    return hex.robber === true;
                });
                previousHex.robber = false;
                // set the new robber hex
                let newHex = {
                    robber: false
                };
                newHex = gameState.hexes.find(hex => {
                    return hex.hexPosition == newRobberHex;
                })
                newHex.robber = true;

                gameState.turnPhase = 'build/trade/devcard_phase';

                // store game state
                gameStateRef.child(id).set(JSON.stringify(gameState), function (err) {
                    if (err) io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));
                })
            })
                .catch(function (err) {
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                })


        }

        // Dice roll (2-6, 8-12): give out resources to players
        if (req.string == 'regular_roll') {
            let roll = req.roll;
            let id = req.gameStateId;

            gameStateRef.child(id).once('value').then(function (snapshot) {
                let gameState = JSON.parse(snapshot.val());
                gameState.hexes.forEach(hex => {
                    if (hex.diceNumber == roll && hex.robber == false) {
                        // give resources to all the players that own a settlement on this hex
                        hex.settlements.forEach(settlement => {
                            boardFunctions.addResource(hex.resourceType, getPlayerByID(settlement.player, gameState));
                        });

                        // give resources to all the players that own a city on this hex
                        hex.cities.forEach(city => {
                            boardFunctions.addResource(hex.resourceType, getPlayerByID(city.player, gameState));
                            boardFunctions.addResource(hex.resourceType, getPlayerByID(city.player, gameState));
                        });
                    }
                });
                gameState.turnPhase = 'build/trade/devcard_phase';
                // store game state
                gameStateRef.child(id).set(JSON.stringify(gameState), function (err) {
                    if (err) io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));
                })
            })
                .catch(function (err) {
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                })


        }

        // build road 
        if (req.string == 'build_road') {
            let id = req.gameStateId;
            gameStateRef.child(id).once('value').then(function (snapshot) {
                let gameState = JSON.parse(snapshot.val());
                gameState.currentTurn = gameState.players[gameState.currentPlayerNum];
                let currentPlayer = gameState.currentTurn;

                if (gameState.turnPhase == 'roll_phase') io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: 'Cannot build during roll phase' }));

                if (boardFunctions.isValidRoad(req.start, req.end, gameState)) {
                    if (gameState.turnPhase !== 'setup_placement') {
                        if (currentPlayer.resources.Wood > 0 && currentPlayer.resources.Brick > 0) {
                            let road = new Road({ player: currentPlayer._id, start: req.start, end: req.end });
                            gameState.roads.push(road);
                            boardFunctions.addRoadToHex(road, gameState);
                            currentPlayer.resources.Wood--;
                            currentPlayer.resources.Brick--;

                            // store game state
                            gameStateRef.child(id).set(JSON.stringify(gameState), function (err) {
                                if (err) io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                                io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));
                            })
                        } else {
                            io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ invalidMove: 'Insufficient resources' }));
                        }
                        // if during setup, don't check for resources
                    } else if (gameState.setupRoad < 1) {
                        let road = new Road({ player: currentPlayer._id, start: req.start, end: req.end });
                        gameState.roads.push(road);
                        boardFunctions.addRoadToHex(road, gameState);
                        gameState.setupRoad++;
                        // if the player has placed both their setup road AND settlement then go to next player
                        if (gameState.setupRoad > 0 && gameState.setupSettlement > 0) {
                            gameState = boardFunctions.advanceToNextTurn(gameState);
                        }

                        // store game state
                        gameStateRef.child(id).set(JSON.stringify(gameState), function (err) {
                            if (err) io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                            io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));
                        })
                    }
                } else {
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ invalidMove: 'Invalid road position' }));
                }
            })
                .catch(function (err) {
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                })


        }

        // build settlement
        if (req.string == 'build_settlement') {
            let id = req.gameStateId;
            gameStateRef.child(id).once('value').then(function (snapshot) {
                let gameState = JSON.parse(snapshot.val());
                gameState.currentTurn = gameState.players[gameState.currentPlayerNum];
                let currentPlayer = gameState.currentTurn;

                if (gameState.turnPhase == 'roll_phase') io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ invalidMove: 'Cannot build during roll phase' }));

                if (boardFunctions.isValidSettlement(req.location, currentPlayer, gameState)) {
                    if (gameState.turnPhase !== 'setup_placement') {

                        // REMOVE FOR PROD
                        currentPlayer.resources.Brick = currentPlayer.resources.Brick + 1;
                        currentPlayer.resources.Wheat = currentPlayer.resources.Wheat + 1;
                        currentPlayer.resources.Wood = currentPlayer.resources.Wood + 1;
                        currentPlayer.resources.Sheep = currentPlayer.resources.Sheep + 1;

                        if (currentPlayer.resources.Wood > 0 && currentPlayer.resources.Brick > 0 && currentPlayer.resources.Wheat > 0 && currentPlayer.resources.Sheep > 0) {
                            let settlement = new Settlement({ player: currentPlayer._id, location: req.location });
                            gameState.settlements.push(settlement);
                            boardFunctions.addSettlementToHex(settlement, gameState);
                            currentPlayer.resources.Wood--;
                            currentPlayer.resources.Brick--;
                            currentPlayer.resources.Wheat--;
                            currentPlayer.resources.Sheep--;
                            getPlayerByID(currentPlayer._id, gameState).VictoryPoints++;
                            boardFunctions.checkWinCondition(getPlayerByID(currentPlayer._id, gameState), gameState);
                            // store game state
                            gameStateRef.child(id).set(JSON.stringify(gameState), function (err) {
                                if (err) io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                                io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));
                            })
                        } else {
                            io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ invalidMove: 'Insufficient resources' }));
                        }
                        // if during setup, don't check for resources
                    } else if (gameState.setupSettlement < 1) {
                        let settlement = new Settlement({ player: currentPlayer._id, location: req.location });
                        gameState.settlements.push(settlement);
                        getPlayerByID(currentPlayer._id, gameState).settlementCount++;
                        // if the settlement is the second setup settlement, give the player the connecting resources
                        if (getPlayerByID(currentPlayer._id, gameState).settlementCount == 2) {
                            boardFunctions.addSettlementToHexWithResources(settlement, currentPlayer._id, gameState);
                        } else {
                            boardFunctions.addSettlementToHex(settlement, gameState);
                        }
                        getPlayerByID(currentPlayer._id, gameState).VictoryPoints++;

                        gameState.setupSettlement++;
                        // if the player has placed both their setup road AND settlement then go to next player
                        if (gameState.setupRoad > 0 && gameState.setupSettlement > 0) {
                            gameState = boardFunctions.advanceToNextTurn(gameState);
                            console.log("player switched")
                        }

                        // store game state
                        gameStateRef.child(id).set(JSON.stringify(gameState), function (err) {
                            if (err) io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                            io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));
                        })
                    }
                } else {
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ invalidMove: 'Invalid settlement position' }));
                }
            })
                .catch(function (err) {
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                })


        }

        // upgrade settlement to city
        if (req.string == 'build_city') {
            let id = req.gameStateId;

            gameStateRef.child(id).once('value').then(function (snapshot) {
                let gameState = JSON.parse(snapshot.val());
                gameState.currentTurn = gameState.players[gameState.currentPlayerNum];
                let currentPlayer = gameState.currentTurn;

                if (gameState.turnPhase == 'roll_phase') io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ invalidMove: 'Cannot build during roll phase' }));

                if (boardFunctions.checkValidCity(req.location, gameState, currentPlayer)) {

                    // REMOVE THIS FOR PRODUCTION
                    currentPlayer.resources.Ore = currentPlayer.resources.Ore + 3;
                    currentPlayer.resources.Wheat = currentPlayer.resources.Wheat + 2;

                    if (currentPlayer.resources.Ore > 2 && currentPlayer.resources.Wheat > 1) {
                        boardFunctions.deleteSettlementAtLocation(req.location, gameState);
                        let city = new City({ player: currentPlayer._id, location: req.location });
                        gameState.cities.push(city);
                        boardFunctions.addCityToHex(city, gameState);
                        currentPlayer.resources.Wheat = currentPlayer.resources.Wheat - 2;
                        currentPlayer.resources.Ore = currentPlayer.resources.Ore - 3;
                        getPlayerByID(currentPlayer._id, gameState).VictoryPoints++;
                        boardFunctions.checkWinCondition(getPlayerByID(currentPlayer._id, gameState), gameState);
                        // store game state
                        gameStateRef.child(id).set(JSON.stringify(gameState), function (err) {
                            if (err) io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                            io.sockets.emit('PLAYER_CONNECT', JSON.stringify(gameState));
                        })
                    } else {
                        io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ invalidMove: 'Insufficient Resources' }));
                    }
                } else {
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ invalidMove: 'Invalid city position' }));
                }
            })
                .catch(function (err) {
                    io.sockets.emit('PLAYER_CONNECT', JSON.stringify({ error: err }));
                })
        }

    })

    // trade resources between players

    // trade resources from bank

    // purchase dev card

    // play dev card

});
