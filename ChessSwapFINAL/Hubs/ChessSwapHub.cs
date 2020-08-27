using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace ChessSwapFINAL.Hubs
{
    public class ChessSwapHub : Hub<IChessSwapClient>
    {
        private static int gameId = 0;
        private static bool createNew = false;
        
        
        public async Task LookForGroup()
        {
            await Clients.Caller.WriteSomething("Lets fucking go");
        }
        
        public async Task UpdateGame(int gameId, string sourceSqaure, string targetSquare, bool swap)
        {
            await Clients.OthersInGroup(gameId.ToString()).UpdateChessBoard(sourceSqaure, targetSquare, swap);
        }
        
        
        public override Task OnConnectedAsync()
        {
            Console.WriteLine("New Client Connected");
            Console.WriteLine("Client joins group " + gameId);

            if (createNew)
            {
                Console.WriteLine("Creating new Group");
                Groups.AddToGroupAsync(Context.ConnectionId, gameId.ToString());
                //Clients.Group(gameId.ToString()).WriteSomething("You are now in gameId " + gameId);
                //Clients.Group(gameId.ToString()).RegisterGameId(gameId);
                
                // Setup colors
                Clients.Caller.RegisterGame(gameId, "white");
                Clients.OthersInGroup(gameId.ToString()).RegisterGame(gameId, "black");

                gameId++;
                createNew = false;
            }
            else
            {
                createNew = true;
                Groups.AddToGroupAsync(Context.ConnectionId, gameId.ToString());
            }
            return base.OnConnectedAsync();
        }
    }
}