import React, { Component } from "react";
import PropTypes from "prop-types";
import Chess from "chess.js"; // import Chess from  "chess.js"(default) if recieving an error about new Chess() not being a constructor
import Chessboard from "chessboardjsx";
import {HubConnectionBuilder} from "@aspnet/signalr/dist/esm/HubConnectionBuilder";

class HumanVsHuman extends Component {
    static propTypes = { children: PropTypes.func };
    
    

    state = {
        fen: "start",
        // square styles for active drop square
        dropSquareStyle: {},
        // custom square styles
        squareStyles: {},
        // square with the currently clicked piece
        pieceSquare: "",
        // currently clicked square
        square: "",
        // array of past game moves
        history: [],
        // current board orientation
        orientation: "black",
        // Connection to Multiplayer Hub
        hubConnection: null,
        // Current players turn
        currentMyTurn: true,
        gameId: null,
        keepTrackOfTurns: false,
        turnCounter: 0
    };

    componentDidMount() {
        this.game = new Chess();

        const connection = new HubConnectionBuilder().withUrl("/ChessSwapHub").build();

        async function start() {
            try {
                await connection.start();
                console.log("connected");
            } catch (err) {
                console.log(err);
                setTimeout(() => start(), 5000);
            }
        };

        connection.onclose(async () => {
            await start();
        });
        
        start();
        
        connection.on("WriteSomething", (message) => {console.log("Recieved message from server: " + message)})
        connection.on("UpdateChessBoard", (sourceSquare, targetSquare, swap) => {
            this.updateMove(sourceSquare, targetSquare); 
            this.state.currentMyTurn = true;
            if (swap){
                this.setState(() => ({
                    keepTrackOfTurns: true,
                    orientation: (this.state.orientation === "black" ? "white" : "black"), // ORIENTATION SWAP
                    currentMyTurn: false
                }))
            }
        })
        connection.on("RegisterGame", (gameId, color) => {
            this.setState(() => ({
                gameId: gameId,
                orientation: color,
                currentMyTurn: (color === "white"),
                keepTrackOfTurns: (color === "white")
            }))
            console.log("Registered game id " + gameId + ". You are color: " + color);
            })
  
        this.state.hubConnection = connection;

        /*       this.setState({HubConnection}, () => {
                 new HubConnectionBuilder().withUrl("/ChessSwapHub").build();
       
                   
               })*/
    }

    // keep clicked square style and remove hint squares
    removeHighlightSquare = () => {
        this.setState(({ pieceSquare, history }) => ({
            squareStyles: squareStyling({ pieceSquare, history })
        }));
    };

    // show possible moves
    highlightSquare = (sourceSquare, squaresToHighlight) => {
        const highlightStyles = [sourceSquare, ...squaresToHighlight].reduce(
            (a, c) => {
                return {
                    ...a,
                    ...{
                        [c]: {
                            background:
                                "radial-gradient(circle, #fffc00 36%, transparent 40%)",
                            borderRadius: "50%"
                        }
                    },
                    ...squareStyling({
                        history: this.state.history,
                        pieceSquare: this.state.pieceSquare
                    })
                };
            },
            {}
        );

        this.setState(({ squareStyles }) => ({
            squareStyles: { ...squareStyles, ...highlightStyles }
        }));
    };
    
    updateMove = (sourceSquare, targetSquare) => {
        // see if the move is legal
        let move = this.game.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: "q" // always promote to a queen for example simplicity
        });

        // illegal move
        if (move === null) return false;

        this.setState(({ history, pieceSquare }) => ({
            fen: this.game.fen(),
            history: this.game.history({ verbose: true }),
            squareStyles: squareStyling({ pieceSquare, history }),
            //orientation: (this.state.orientation === "black" ? "white" : "black"), // ORIENTATION SWAP
            currentMyTurn: false
        }));
        return true
    }
    
    

    onDrop = ({ sourceSquare, targetSquare }) => {
        // Not my turn
        if (!this.state.currentMyTurn) return;
        
        let successfullyMoved = this.updateMove(sourceSquare, targetSquare)
        
        if (!successfullyMoved) return
        if (this.state.keepTrackOfTurns){
            this.setState(() => ({turnCounter: this.state.turnCounter + 1}))
        }
        
        console.log("Current torunCounter is: " + this.state.turnCounter)
        
        if (this.state.turnCounter === 3){
            console.log("time to swap")
            this.state.hubConnection.invoke("UpdateGame", this.state.gameId, sourceSquare, targetSquare, true);
            this.setState(() => ({
                turnCounter: 0, 
                keepTrackOfTurns: false,
                orientation: (this.state.orientation === "black" ? "white" : "black"), // ORIENTATION SWAP
                currentMyTurn: true
            }))
        }
        else{
            console.log("not swapping")
            this.state.hubConnection.invoke("UpdateGame", this.state.gameId, sourceSquare, targetSquare, false)
        }
        

    };

    onMouseOverSquare = square => {
        // get list of possible moves for this square
        let moves = this.game.moves({
            square: square,
            verbose: true
        });

        // exit if there are no moves available for this square
        if (moves.length === 0) return;

        let squaresToHighlight = [];
        for (var i = 0; i < moves.length; i++) {
            squaresToHighlight.push(moves[i].to);
        }

        this.highlightSquare(square, squaresToHighlight);
    };

    onMouseOutSquare = square => this.removeHighlightSquare(square);

    // central squares get diff dropSquareStyles
    onDragOverSquare = square => {
        this.setState({
            dropSquareStyle:
                square === "e4" || square === "d4" || square === "e5" || square === "d5"
                    ? { backgroundColor: "cornFlowerBlue" }
                    : { boxShadow: "inset 0 0 1px 4px rgb(255, 255, 0)" }
        });
    };

    onSquareClick = square => {
        this.setState(({ history }) => ({
            squareStyles: squareStyling({ pieceSquare: square, history }),
            pieceSquare: square
        }));

        let move = this.game.move({
            from: this.state.pieceSquare,
            to: square,
            promotion: "q" // always promote to a queen for example simplicity
        });

        // illegal move
        if (move === null) return;

        this.setState({
            fen: this.game.fen(),
            history: this.game.history({ verbose: true }),
            pieceSquare: ""
        });
    };

    onSquareRightClick = square =>
        this.setState({
            squareStyles: { [square]: { backgroundColor: "deepPink" } }
        });

    render() {
        const { fen, dropSquareStyle, squareStyles, orientation } = this.state;

        return this.props.children({
            squareStyles,
            position: fen,
            onMouseOverSquare: this.onMouseOverSquare,
            onMouseOutSquare: this.onMouseOutSquare,
            onDrop: this.onDrop,
            dropSquareStyle,
            onDragOverSquare: this.onDragOverSquare,
            onSquareClick: this.onSquareClick,
            onSquareRightClick: this.onSquareRightClick,
            orientation: orientation
        });
    }
}

export default function WithMoveValidation() {
    return (
        <div>
            <HumanVsHuman>
                {({
                      position,
                      onDrop,
                      onMouseOverSquare,
                      onMouseOutSquare,
                      squareStyles,
                      dropSquareStyle,
                      onDragOverSquare,
                      onSquareClick,
                      onSquareRightClick,
                      orientation
                  }) => (
                    <Chessboard
                        id="humanVsHuman"
                        width={640} // CHANGE WIDTH OF BOARD HERE
                        position={position}
                        onDrop={onDrop}
                        onMouseOverSquare={onMouseOverSquare}
                        onMouseOutSquare={onMouseOutSquare}
                        boardStyle={{
                            borderRadius: "5px",
                            boxShadow: `0 5px 15px rgba(0, 0, 0, 0.5)`
                        }}
                        squareStyles={squareStyles}
                        dropSquareStyle={dropSquareStyle}
                        onDragOverSquare={onDragOverSquare}
                        onSquareClick={onSquareClick}
                        onSquareRightClick={onSquareRightClick}
                        orientation={orientation}
                    />
                )}
            </HumanVsHuman>
            <h1>You're in game with ID: (check console)...</h1>
        </div>
    );
}

const squareStyling = ({ pieceSquare, history }) => {
    const sourceSquare = history.length && history[history.length - 1].from;
    const targetSquare = history.length && history[history.length - 1].to;

    return {
        [pieceSquare]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
        ...(history.length && {
            [sourceSquare]: {
                backgroundColor: "rgba(255, 255, 0, 0.4)"
            }
        }),
        ...(history.length && {
            [targetSquare]: {
                backgroundColor: "rgba(255, 255, 0, 0.4)"
            }
        })
    };
};
