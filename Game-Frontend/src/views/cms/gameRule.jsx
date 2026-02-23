
const GameRule = () => {
    return (
        <div className='cms-page'>
            <div className="cms-header">21 Holdem - Official Rules</div>
            <div className="cms-content">
                <p className='content-title mt-0'>Objective</p>
                <ul>
                    <li>21 Hold'em is a poker-inspired blackjack variant where players compete to form the highest hand without exceeding 21.</li>
                    <li>The game features betting rounds, communal cards, and the option to double down in the first round.</li>
                </ul>
                <p className='content-title'>Setup & Gameplay Structure Players & Table Setup</p>
                <ul>
                    <li>21 Holdem is played with 2-9 players at the table.</li>
                    <li>A rotating dealer determines the order of play.</li>
                    <li>The player to the dealer's left posts the small blind (SB), and the next player posts the big blind (BB).</li>
                    <li>The game uses a standard 52-card deck.</li>
                </ul>
                <p className='content-title'>Betting Rounds & Card Distribution Initial Deal</p>
                <ul>
                    <li>Each player is dealt one private card face down.</li>
                    <li>The first betting round begins.</li>
                    <li>Betting Rounds & Communal Cards</li>
                    <li>The game has four betting rounds, with a new communal card revealed in each:</li>
                    <li>Pre-Action Round: Players bet based on their private card. They may also double down (DD) during this round.</li>
                    <li>Action Round: The first communal card (the Action Card) is revealed, followed by another round of betting.</li>
                    <li>Stage Round: The second communal card (the Stage Card) is revealed, followed by another round of betting.</li>
                    <li>Show Round: The third communal card (the Show Card) is revealed, followed by the final betting round.</li>
                    <li>Caboose (Optional): If required, a fourth communal card (the Caboose Card) may be dealt under special circumstances</li>
                </ul>
                <p>After the final betting round, any remaining players reveal their hands, and the best hand (closest to 21 without exceeding it) wins.</p>
                <p className='content-title'>Actions & Betting Options Betting Actions</p>
                <p>During each round, players can:</p>
                <ul>
                    <li>Check: If no bet has been placed, the player may pass their turn.</li>
                    <li>Bet: If no bet has been placed, a player can wager a certain amount.</li>
                    <li>Call: If another player has bet, the player can match the bet.</li>
                    <li>Raise: If another player has bet, the player can increase the bet.</li>
                    <li>Fold: The player discards their hand and forfeits the round.</li>
                </ul>
                <p className='content-title'>Doubling Down (DD)</p>
                <p>Players can only double down in the first betting round.</p>
                <ul>
                    <li>How it works: A player doubles their bet and receives one additional private card, which they must use instead of any communal cards.</li>
                </ul>
                <p><strong>Limitations</strong> DD players are locked into their hand total and cannot raise in later rounds (but can call or fold). If a DD player hits 21 exactly, the round ends immediately, and they win the pot. <strong>Standing</strong> Players may choose to stand at any time, locking in their current hand total. A standing player does not receive additional communal cards. Standing players can still call or fold if other players bet</p>
                <p className='content-title'>Winning & Hand Evaluation Hand Values</p>
                <p>The goal is to get as close to 21 as possible without exceeding it.</p>
                <ul>
                    <li>Card values:
                        <ul>
                            <li>Number cards (2-10) are worth face value.</li>
                            <li>Face cards (J, Q, K) are worth 10.</li>
                            <li>Aces (A) can be worth 1 or 11, depending on what benefits the player.</li>
                        </ul>
                    </li>
                </ul>
                <p className='content-title'>Instant Wins</p>
                <ul>
                    <li>Blackjack (Ace + 10-value card) wins immediately if it occurs in the first round.</li>
                    <li>If a player who doubled down reaches exactly 21, they immediately win the pot.</li>
                    <li>Tiebreakers & Split Pots</li>
                    <li>If multiple players tie with the highest total, the pot is split equally between them.</li>
                    <li>There are no additional adjustments based on risk or communal card usage.</li>
                </ul>
                <p className='content-title'>Betting Strategies</p>
                <ul>
                    <li>Bluffing is less effective than in poker but can still pressure opponents into folding.</li>
                    <li>Reading opponents' betting patterns can give insight into whether they hold a strong hand.</li>
                </ul>

            </div>
        </div>
    )
}

export default GameRule