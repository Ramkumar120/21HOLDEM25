
const HowToPlay = () => {
    return (
        <div className='cms-page'>
            <div className="cms-header">How To Play</div>
            <div className="cms-content">
                <p className="content-title mt-0">Step 1: Take a Seat</p>
                <ul>
                    <li>Choose a seat at a <strong>9-player table</strong>.</li>
                    <li>The <strong>Dealer (D)</strong> rotates after each round.</li>
                    <li>The <strong>Small Blind (SB)</strong> and <strong>Big Blind (BB)</strong> are seated <strong>to the right</strong> of the dealer.</li>
                </ul>
                <p className="content-title">Step 2: Posting the Blinds</p>
                <ul>
                    <li>The <strong>Small Blind (SB)</strong> posts half the Big Blind.</li>
                    <li>The <strong>Big Blind (BB)</strong> posts a full mandatory bet.</li>
                    <li>Each player is dealt<strong>one private card.</strong></li>
                </ul>
                <p className="content-title">Step 3: First Betting Rounds</p>
                <p>After receiving your private card, you can: <strong>✔ Call</strong> - Match the Big Blind. <strong>✔ Raise</strong> - Increase the bet. <strong>✔ Fold</strong> - Give up your hand. <strong>✔ Double Down (DD) - Match the current pot</strong> and receive <strong>one additional private card.</strong></p>
                <p><strong>⚠️ Important:</strong></p>
                <ul>
                    <li><strong>Standing is not allowed in the first round.</strong></li>
                    <li>If you <strong>check</strong> or <strong>call</strong>, you lose the right to raise later in the round.</li>
                </ul>
                <p className="content-title">Step 4: Raising - Increasing the Bet</p>
                <p>When it's your turn to act, you may choose to <strong>Raise</strong> instead of just calling. There are three raise options:</p>
                <p><strong>🔹 Minimum Raise</strong> - Must be at least the size of the Big Blind (BB). <strong>🔹 Half-Pot Raise</strong> - 50% of the current pot. <strong>🔹 Pot Raise </strong> - 100% of the current pot.</p>
                <p><strong>⚠️ Raise Restrictions:</strong></p>
                <ul>
                    <li>Once a player selects a <strong>Pot Raise</strong>, no other player may raise higher than that. Other players may only <strong>Call or Fold.</strong></li>
                    <li>If you <strong>check</strong> in a round, you <strong>lose the right to raise</strong> later in that same round.</li>
                </ul>
                <p className="content-title">Step 5: The Double Down (DD) Process</p>
                <ul>
                    <li>If you <strong>Double Down (DD)</strong>, you must <strong>match the current pot size.</strong></li>
                    <li>You receive <strong>one additional private card.</strong></li>
                    <li>Your hand is <strong>locked in</strong> - you cannot use community cards.</li>
                    <li>You <strong>cannot raise or bet</strong> in later rounds; you may only <strong>call or fold</strong> if facing a bet.</li>
                    <li>If you hit <strong>21</strong>, you win immediately.</li>
                </ul>
                <p className="content-title">Step 6: Revealing Community Cards</p>
                <p>After each betting round, a new community card is revealed: 1️⃣ Action Card 2️⃣ Stage Card 3️⃣ Show Card 4️⃣ Caboose Card (if needed) Players can use these cards to improve their hand, unless they have Doubled Down.</p>
                <p className="content-title">Step 7: Second and Third Betting Rounds</p>
                <ul>
                    <li>Another round of betting happens after each new community card.</li>
                    <li>Betting options: <strong>Call, Raise, Fold, or Stand.</strong></li>
                </ul>
                <p><strong>⚠️ If you check in a betting round, you cannot raise later in that round.</strong></p>
                <p className="content-title">Step 8: Standing - Locking in Your Hand</p>
                <ul>
                    <li>You may choose to <strong>Stand</strong> in any betting round <strong>after</strong> the first community card is revealed.</li>
                    <li>When you Stand:
                        <ul>
                            <li>You <strong>lock in</strong> your current hand total.</li>
                            <li>You <strong>will not receive any more community cards.</strong></li>
                            <li>You <strong>cannot raise or bet,</strong> but you can <strong>call or fold</strong> if facing a bet.</li>
                            <li>If you are <strong>facing a raise,</strong> selecting Stand will automatically <strong>Call and Stand.</strong></li>
                            <li>If you are not <strong>facing a raise,</strong> selecting Stand simply locks in your hand.</li>
                        </ul>
                    </li>
                </ul>
                <p className="content-title"><strong>Step 9: Showdown - Deciding the Winner</strong></p>
                <p>The round ends when: ✅ All remaining players <strong>Stand</strong>. ✅ All players <strong>Double Down</strong>. ✅ All but one player <strong>Busts</strong> (exceeds 21).</p>
                <p><strong>🏆 Winning Conditions:</strong></p>
                <ul>
                    <li><strong>A player hitting 21 wins immediately.</strong></li>
                    <li>If multiple players hit 21, the pot is split.</li>
                    <li>If no one hits 21, the closest to 21 wins.</li>
                    <li><strong>DD players who don't hit 21 lose their bet to the house (minus the BB).</strong></li>
                </ul>
                <p className="content-title">Step 10: Next Round Begins</p>
                <ul>
                    <li>The <strong>Dealer position moves one seat clockwise.</strong></li>
                    <li>Small Blind and Big Blind also shift.</li>
                    <li>A new hand begins!</li>
                </ul>
            </div>
        </div>
    )
}

export default HowToPlay