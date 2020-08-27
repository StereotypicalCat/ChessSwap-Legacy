using System.Threading.Tasks;

namespace ChessSwapFINAL.Hubs
{
    public interface IChessSwapClient
    {
        Task WriteSomething(string Message);
        Task UpdateChessBoard(string sourceSquare, string targetSquare, bool swap);
        Task RegisterGame(int gameId, string color);
        
    }
}