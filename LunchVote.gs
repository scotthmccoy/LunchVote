//Input: several ranges representing ballots
//Output: a Shulze-Ranking of the candidates
function LUNCHVOTE() {
    
    //Get ballots from arguments
    var ballots = [];
    for (var i=0; i<arguments.length; i++) {
        //Get a ballot (a cell range) and walk its contents
        var ballot = arguments[i];
        ballots.push(ballot);
    }
    
    var legalCandidates = getLegalCandidates(ballots);
    var ret = runElection(legalCandidates, ballots);
    
    return ret;
}

//Input: Several ranges, the first of which is the list of legal candidates, and the rest of which are numerical rankings for those candidates.
//Output: The numerical ranking for each candidate in the list of legal candidates
function LUNCHVOTE_RANK() {
    if (arguments.length < 2) {
        return "Usage: LUNCHVOTE_RANK(candidates, ballot_1, ballot_2, ... ballot_n)";
    }
    
    var legalCandidates = arguments[0];
    
    //Truncate legalCandidates to the first empty cell
    for (var i=0; i<legalCandidates.length; i++) {
        if (legalCandidates[i][0] == "") {
            legalCandidates = legalCandidates.slice(0,i);
        }
    }
    
    if (legalCandidates.length == 0) {
        return "No legal candidates";
    }
    
    //Get the first element (the contents of the cell)
    legalCandidates = legalCandidates.map(function(cell){
        return cell[0];
    });
    
    //Extract Ballots
    var ballots = [];
    for (var i=1; i<arguments.length; i++) {
        var voterInput = arguments[i];
        var candidateRankPairings = [];
        var ballot = [];
        
        //Walk the list of candidates. For every candidate that the voter put a rank next to,
        //Push the pairing of that candidate and the rank into candidateRankPairings.
        for (var j=0; j<legalCandidates.length; j++) {
            var candidate = legalCandidates[j];
            var rank = voterInput[j][0];
            
            
            
            if (rank != "") {
                candidateRankPairings.push([candidate, rank]);
            }
        }
        
        //Sort candidateRankPairings by rank
        var candidateRankPairingsSorted = candidateRankPairings.sort(function(a,b){
            return a[1]-b[1];
        });
        
        //Walk candidateRankPairings and pack each candidate into a ballot
        var currentRank = candidateRankPairingsSorted[0][1];
        var ballotRank = [];
        for (var j=0; j<candidateRankPairingsSorted.length; j++) {
            
            var candidate = candidateRankPairingsSorted[j][0];
            var rank = candidateRankPairingsSorted[j][1];
            
            //If it's a new rank, push the candidates in the previous rank and add a new empty rank
            if (rank != currentRank) {
                ballot.push(ballotRank.sort());
                currentRank = rank;
                ballotRank = [];
            }
            
            //Add the candidate to the (possibly new) rank
            ballotRank.push(candidate);
        }
        //Append the last rank
        ballot.push(ballotRank.sort());
        
        //Append ballot to ballots
        ballots.push(ballot);
    }
    
    //TODO: move this into runElection
    //Find groups of candidates that are always grouped together and treat them
    //as single candidates
    var candidateGroups = packCandidates(ballots);
    var packedBallots = packBallots(candidateGroups, ballots);
    var packedLegalCandidates = getLegalCandidates(ballots);
    
    //Run the election
    var electionResults = runElection(packedLegalCandidates, packedBallots);
    
    //TODO: unpack the ballots
    var unpackedResults = unpackElectionResults(candidateGroups, electionResults);
    
    ///////////////////////////////////////////
    //Map the results back to a single array
    ///////////////////////////////////////////
    
    //Make a copy of legalCandidates
    var results = legalCandidates.slice();
    
    //Replace candidate with Rank
    for (var i=0; i<electionResults.length; i++) {
        var rank = electionResults[i];
        
        for (var j=0; j<rank.length; j++) {
            var candidate = rank[j];
            
            var candidateRank = i+1;
            var candidateIndex = legalCandidates.indexOf(candidate);
            
            results[candidateIndex] = [candidateRank.toString()];
        }
    }
    
    //Prepend a label
    results.unshift(["Results:"]);
    return results;
}

function CANDIDATES() {
    //Get ballots from arguments
    var ballots = [];
    for (var i=0; i<arguments.length; i++) {
        //Get a ballot (a cell range) and walk its contents
        var ballot = arguments[i];
        ballots.push(ballot);
    }
    
    var legalCandidates = getLegalCandidates(ballots);
    return legalCandidates;
}


//Input: array of ballots (2-D arrays)
//Output: A 2D array of candidates that are always grouped together
function packCandidates(ballots) {
    if (ballots.length == 0) {
        return [[]];
    }
    
    if (ballots.length == 1) {
        return ballots;
    }
    
    //Use the first ballot as the first set of candidateGroups
    var candidateGroups = ballots[0].slice(0);
    var candidateGroupsNext = [];
    
    //Walk the ballots
    for (var i=1; i<ballots.length; i++) {
        
        var ballot = ballots[i];
        
        //Walk the ballot
        for (var j=0; j<ballot.length; j++) {
            var ballotRank = ballot[j];
            
            //Walk all the candidate groups and find intersections
            for (var k=0; k<candidateGroups.length; k++) {
                var candidateGroup = candidateGroups[k];
                var intersection = intersect_safe(candidateGroup, ballotRank);
                if (intersection.length >= 2) {
                    candidateGroupsNext.push(intersection);
                }
            }
        }
        
        candidateGroups = candidateGroupsNext;
        candidateGroupsNext = [];
    }
    
    return candidateGroups;
}

//Input:
//packedCandidates: an 2D array of groups of candidates (sorted by name) that always occur together on ballots.
//ballots: 3-D array of groups of candidates representing several voter's preferences.
function packBallots(packedCandidates, ballots) {
    
    //Walk the ballots and allow the first candidate in a group to be a placeholder for
    //all candidates in that group.
    for (var i=0; i<ballots.length; i++) {
        
        var ballot = ballots[i];
        
        //Walk the ballot
        for (var j=0; j<ballot.length; j++) {
            var ballotRank = ballot[j];
            
            //Walk all the packedCandidates and find intersections
            for (var k=0; k<packedCandidates.length; k++) {
                var candidateGroup = packedCandidates[k];
                
                //Do we see the first candidate in the group anywhere in the ballot rank?
                var groupFoundAtIndex = ballotRank.indexOf(candidateGroup[0]);
                if (groupFoundAtIndex != -1) {
                    //Delete all but the first candidate in the group from the ballotRank.
                    ballot[j].splice(groupFoundAtIndex+1,candidateGroup.length-1);
                }
            }
        }
    }
    
    return ballots;
}


//Input:
//candidateGroups: the output of packCandidates on a set of ballots - a 2D array of
//candidates that are always grouped together and may be treated as a single candidate.
//electionResults: the output of runElection - a 2D array of candidates representing the outcome of the election assuming packed candidates.
//Output:
//A 2D array of candidates representing the "true" outcome of the election.
function unpackElectionResults(candidateGroups, electionResults) {
    
    //Walk the ranks in the electionResult
    for (var i=0; i<electionResults.length; i++) {
        
        var electionResultRank = electionResults[i];
        
        //Search for the "placeholder" candidates and replace them with the unpacked candidates
        for (var k=0; k<packedCandidates.length; k++) {
            var candidateGroup = packedCandidates[k];
            
            //Do we see the first candidate in the group anywhere in the ballot rank?
            var groupFoundAtIndex = ballotRank.indexOf(candidateGroup[0]);
            if (groupFoundAtIndex != -1) {
                //Delete all but the first candidate in the group from the ballotRank.
                ballot[j].splice(groupFoundAtIndex+1,candidateGroup.length-1);
            }
        }
        
    }
    
    return ballots;
}


//Input:
//legalCandidates: a 2-D array
//ballots: a 3-D array of candidate names representing several voters' preference orders
//Output:
//A 2D array of candidate names representing the election results
function runElection(legalCandidates, ballots) {
    
    //Convert ballots to matrices
    var matrices = [];
    for (var i=0; i<ballots.length; i++) {
        
        var matrix = processAndConvert(ballots[i], legalCandidates);
        
        matrices.push(matrix);
    }
    
    var pairwiseMatrix = addMatrices(matrices);
    var shulzeBeatpathMatrix = getShulzeBeatpathMatrix(pairwiseMatrix);
    var ret = convertShulzeMatrixToElectionResult(shulzeBeatpathMatrix, legalCandidates);
    return ret;
    
}


//Creates an alphabetized list of all candidates
function getLegalCandidates(ballots) {
    var legalCandidates = {};
    
    for (i=0; i<ballots.length; i++) {
        
        var ballot = ballots[i];
        
        for (j=0; j<ballot.length; j++) {
            //If the user accidentally sent 2 columns, ignore the subsequent columns using slice.
            //TODO: Add support for ranks
            //Convert element to string and trim, then check for uniqueness by putting it into an associative array.
            var candidate = String(ballot[j]).trim();
            
            if (candidate == "") {
                //Bail at the first empty candidate so we don't walk an entire empty column
                break;
            } else {
                legalCandidates[candidate] = "1";
            }
        }
    }
    
    var ret =  Object.keys(legalCandidates).sort();
    return ret;
}

function processAndConvert(ballot, legalCandidates) {
    var processedBallot = processBallot(ballot, legalCandidates);
    var matrix = convertProcessedBallotToMatrix(processedBallot, legalCandidates.length);
    return matrix;
}

//Converts ballot from 2-d array of strings to a 1-d array of sets of legal candidate IDs.
function processBallot(ballot, legalCandidates) {
    var ret = []
    var candidatesConsumed = {};
    
    
    for (i=0; i<ballot.length; i++) {
        
        var ballotRow = ballot[i];
        var set = {};
        
        for (j=0; j<ballotRow.length; j++) {
            
            //Convert element to string and trim. Ignore blank candidates.
            var candidate = String(ballotRow[j]).trim();
            if (candidate != "") {
                
                var candidateID = legalCandidates.indexOf(candidate);
                if (candidateID != -1 && candidatesConsumed[candidateID] == undefined) {
                    set[candidateID] = 1;
                    candidatesConsumed[candidateID] = 1;
                }
            }
        }
        
        if (Object.keys(set).length > 0) {
            ret.push(set);
        }
        
    }
    
    //Make one last set of all the candidates that aren't on the ballot and push them.
    var lastRank = {};
    for (candidateID=0; candidateID<legalCandidates.length; candidateID++) {
        if (candidatesConsumed[candidateID] == undefined) {
            lastRank[candidateID] = 1;
        }
    }
    
    if (Object.keys(lastRank).length > 0) {
        ret.push(lastRank);
    }
    
    return ret;
}

//Converts a processed ballot to matrix form
function convertProcessedBallotToMatrix(processedBallot, numLegalCandidates) {
    
    var ret = generateZeroMatrix(numLegalCandidates);
    var processedCandidateIDs = {};
    
    for (i=0; i<processedBallot.length; i++) {
        
        var rank = processedBallot[i];
        
        for (var candidateID in rank) {
            //Mark all previously processed candidates as defeating this candidate
            for (var processedCandidateID in processedCandidateIDs) {
                ret[processedCandidateID][candidateID] = 1;
            }
        }
        
        //Mark all candidates in the rank as having been processed
        for (var candidateID in rank) {
            processedCandidateIDs[candidateID] = 1;
        }
    }
    
    return ret;
}

//Input: A matrix of the number of voters who prefer candidate i to candidate j
//Output: The strength of the strongest path from candidate i to candidate j
function getShulzeBeatpathMatrix(pairwiseMatrix) {
    var numCandidates = pairwiseMatrix.length;
    var beatPathStrengthMatrix = generateMatrix(numCandidates, 0);
    
    var runnerIndex=0;
    var opponentIndex=0;
    var k = 0;
    
    //Intitialize beatPathStrengthMatrix to the strength of the win between the two candidates
    for (runnerIndex=0; runnerIndex<numCandidates; runnerIndex++) {
        for (opponentIndex=0; opponentIndex<numCandidates; opponentIndex++) {
            
            var runnerWins = pairwiseMatrix[runnerIndex][opponentIndex];
            var opponentWins = pairwiseMatrix[opponentIndex][runnerIndex];
            
            //If it's a tie, don't do anything.
            if (runnerWins != opponentWins) {
                if (runnerWins > opponentWins) {
                    beatPathStrengthMatrix[runnerIndex][opponentIndex] = runnerWins;
                } else {
                    beatPathStrengthMatrix[runnerIndex][opponentIndex] = 0;
                }
            }
        }
    }
    
    //Floyd–Warshall algorithm for finding the widest path
    for (runnerIndex=0; runnerIndex<numCandidates; runnerIndex++) {
        for (opponentIndex=0; opponentIndex<numCandidates; opponentIndex++) {
            
            if (runnerIndex != opponentIndex) {
                for (k=0; k<numCandidates; k++) {
                    if (runnerIndex != k && opponentIndex != k) {
                        
                        var max1 = beatPathStrengthMatrix[opponentIndex][k];
                        var min1 = beatPathStrengthMatrix[opponentIndex][runnerIndex];
                        var min2 = beatPathStrengthMatrix[runnerIndex][k];
                        
                        beatPathStrengthMatrix[opponentIndex][k] = Math.max(max1, Math.min(min1, min2) );
                    }
                }
            }
        }
    }
    
    return beatPathStrengthMatrix;
}

//Input: a pairwise election matrix
//Output: an array of sets of Candidate Names indicating election results
function convertShulzeMatrixToElectionResult(pairwiseMatrix, legalCandidates) {
    var numCandidates = pairwiseMatrix.length;
    
    //Start off with each candidate having won zero pairwise elections
    var numPairwiseElectionsWon = {};
    for (var i=0; i<numCandidates; i++) {
        numPairwiseElectionsWon[i] = 0;
    }
    
    //Run pairwise elections. This populates numPairwiseElectionsWon.
    for (var runnerIndex = 0; runnerIndex<numCandidates; runnerIndex++) {
        //Don't repeat comparisons!
        for (var opponentIndex = runnerIndex+1; opponentIndex<numCandidates; opponentIndex++) {
            
            var runnerWins = pairwiseMatrix[runnerIndex][opponentIndex];
            var opponentWins = pairwiseMatrix[opponentIndex][runnerIndex];
            
            //If it's a tie, don't do anything.
            if (runnerWins != opponentWins) {
                var victor = -1;
                
                if (runnerWins > opponentWins) {
                    victor = runnerIndex;
                } else {
                    victor = opponentIndex;
                }
                
                var victories = numPairwiseElectionsWon[victor];
                numPairwiseElectionsWon[victor] = victories + 1;
            }
        }
    }
    
    
    var sortedCandidateIDs = Object.keys(numPairwiseElectionsWon).sort(function(a,b){
        return numPairwiseElectionsWon[b]-numPairwiseElectionsWon[a];
    });
    
    
    //Walk the list looking for ties and group them.
    var sortedAndGroupedCandidates = [];
    var valueOfThisRank = numPairwiseElectionsWon[sortedCandidateIDs[0]];
    var rank = [];
    for (var i=0; i<sortedCandidateIDs.length; i++) {
        var candidateID = sortedCandidateIDs[i];
        
        var valueOfThisKey = numPairwiseElectionsWon[candidateID];
        
        //Is this a new group?
        if (valueOfThisKey != valueOfThisRank) {
            
            //Done with the current rank
            sortedAndGroupedCandidates.push(rank);
            
            //Create a new rank
            valueOfThisRank = valueOfThisKey;
            rank = [];
        }
        
        var candidateName = legalCandidates[candidateID];
        rank.push(candidateName);
    }
    sortedAndGroupedCandidates.push(rank);
    
    return sortedAndGroupedCandidates;
}

//////////////////////////////////////////////////////////////
// Utilities
//////////////////////////////////////////////////////////////

//Removes duplicate elements from an array.
function removeDups(array) {
    var outArray = [];
    array.sort();
    outArray.push(array[0]);
    for(var n in array){
        if(outArray[outArray.length-1]!=array[n]){
            outArray.push(array[n]);
        }
    }
    return outArray;
}



function generateArray(size, fillWith) {
    size = size > 0 ? size : 0;
    var arr = [];
    
    while(size--) {
        arr.push(fillWith);
    }
    
    return arr;
}

function generateMatrix(size, fillWith) {
    
    var size = size > 0 ? size : 0;
    var origSize = size;
    
    var ret = [];
    
    while(size--) {
        var line = generateArray(origSize, fillWith);
        ret.push(line);
    }
    
    return ret;
}

function generateZeroMatrix(size) {
    return generateMatrix(size, 0);
}


//Adds together an array of matrices of same size
function addMatrices(matrices) {
    var reducedMatrix = matrices.reduce(function(previousValue, currentValue, currentIndex, array) {
        var ret = [];
        for (var row=0; row<previousValue.length; row++) {
            var newRow = [];
            for (var col=0; col<previousValue.length; col++) {
                newRow.push(previousValue[row][col] + currentValue[row][col]);
            }
            ret.push(newRow);
        }
        return ret;
    });
    
    return reducedMatrix;
    
}

//From http://stackoverflow.com/questions/1885557/simplest-code-for-array-intersection-in-javascript
/* finds the intersection of
 * two arrays in a simple fashion.
 *
 * PARAMS
 *  a - first array, must already be sorted
 *  b - second array, must already be sorted
 *
 * NOTES
 *
 *  Should have O(n) operations, where n is
 *    n = MIN(a.length(), b.length())
 */
function intersect_safe(a, b)
{
    var ai=0, bi=0;
    var result = [];
    
    while( ai < a.length && bi < b.length )
    {
        if      (a[ai] < b[bi] ){ ai++; }
        else if (a[ai] > b[bi] ){ bi++; }
        else /* they're equal */
        {
            result.push(a[ai]);
            ai++;
            bi++;
        }
    }
    
    return result;
}

//////////////////////////////////////////////////////////////
// Testing
//////////////////////////////////////////////////////////////

function expectEquals(name, expected, actual) {
    return expect(name, expected, actual, true);
}

function expectNotEquals(name, expected, actual) {
    return expect(name, expected, actual, false);
}

function expect(name, expected, actual, shouldBeEqual) {
    
    var passed;
    
    var jsonExpected = JSON.stringify(expected);
    var jsonActual = JSON.stringify(actual);
    
    if (shouldBeEqual) {
        passed = jsonExpected == jsonActual;
    } else {
        passed = jsonExpected != jsonActual;
    }
    
    if (passed) {
        Logger.log(name + " Passed!");
    } else {
        Logger.log(name + " Failed. Expected: " + jsonExpected + ", got: " + jsonActual);
    }
    
    return passed;
}

/////////////////
// Test Support
/////////////////
function shulzeWikiExampleTestBallots() {
    var ballots = [];
    
    for (x=1; x<=5; x++) {
        ballots.push([["A"], ["C"], ["B"], ["E"], ["D"]]);
    }
    
    for (x=1; x<=5; x++) {
        ballots.push([["A"], ["D"], ["E"], ["C"], ["B"]]);
    }
    
    for (x=1; x<=8; x++) {
        ballots.push([["B"], ["E"], ["D"], ["A"], ["C"]]);
    }
    
    for (x=1; x<=3; x++) {
        ballots.push([["C"], ["A"], ["B"], ["E"], ["D"]]);
    }
    
    for (x=1; x<=7; x++) {
        ballots.push([["C"], ["A"], ["E"], ["B"], ["D"]]);
    }
    
    for (x=1; x<=2; x++) {
        ballots.push([["C"], ["B"], ["A"], ["D"], ["E"]]);
    }
    
    for (x=1; x<=7; x++) {
        ballots.push([["D"], ["C"], ["E"], ["B"], ["A"]]);
    }
    
    for (x=1; x<=8; x++) {
        ballots.push([["E"], ["B"], ["A"], ["D"], ["C"]]);
    }
    
    return ballots;
}


function shulzeWikiExampleTestBallotsRanks() {
    var ballots = [];
    
    for (x=1; x<=5; x++) {
        ballots.push([["1"], ["3"], ["2"], ["5"], ["4"]]);
    }
    
    for (x=1; x<=5; x++) {
        ballots.push([["1"], ["5"], ["4"], ["2"], ["3"]]);
    }
    
    for (x=1; x<=8; x++) {
        ballots.push([["4"], ["1"], ["5"], ["3"], ["2"]]);
    }
    
    for (x=1; x<=3; x++) {
        ballots.push([["2"], ["3"], ["1"], ["5"], ["4"]]);
    }
    
    for (x=1; x<=7; x++) {
        ballots.push([["2"], ["4"], ["1"], ["5"], ["3"]]);
    }
    
    for (x=1; x<=2; x++) {
        ballots.push([["3"], ["2"], ["1"], ["4"], ["5"]]);
    }
    
    for (x=1; x<=7; x++) {
        ballots.push([["5"], ["4"], ["2"], ["1"], ["3"]]);
    }
    
    for (x=1; x<=8; x++) {
        ballots.push([["3"], ["2"], ["5"], ["4"], ["1"]]);
    }
    
    return ballots;
}



function testShulze() {
    var testsPassing = true;
    
    var ballots = shulzeWikiExampleTestBallots();
    
    
    var legalCandidates = getLegalCandidates(ballots);
    
    var matrices = [];
    for (var i=0; i<ballots.length; i++) {
        
        var matrix = processAndConvert(ballots[i], legalCandidates);
        
        matrices.push(matrix);
    }
    
    var matrices = addMatrices(matrices);
    
    //Test Pairwise Matrix with this set
    var expected = [
                    [0, 20, 26, 30, 22],
                    [25, 0, 16, 33, 18],
                    [19, 29, 0, 17, 24],
                    [15, 12, 28, 0, 14],
                    [23, 27, 21, 31, 0]
                    ];
    testsPassing = testsPassing && expectEquals("Shulze Wiki Example - Pairwise Matrix", expected, matrices);
    
    //Finally, test the Shulze Beatpath Matrix with this set
    var shulzeBeatpathMatrix = getShulzeBeatpathMatrix(matrices);
    expected = [
                [0, 28, 28, 30, 24],
                [25, 0, 28, 33, 24],
                [25, 29, 0, 29, 24],
                [25, 28, 28, 0, 24],
                [25, 28, 28, 31, 0]
                ];
    testsPassing = testsPassing && expectEquals("Shulze Wiki Example - Beatpath Matrix", expected, shulzeBeatpathMatrix);
    
    //Convert the Beatpath Matrix to an election Result
    expected = [["E"], ["A"], ["C"], ["B"], ["D"]];
    var electionResult = convertShulzeMatrixToElectionResult(shulzeBeatpathMatrix, legalCandidates);
    testsPassing = testsPassing && expectEquals("Shulze Wiki Example - Election Results", expected, electionResult);
    
    return testsPassing;
}

///////////////
// Unit Tests
///////////////

function test() {
    var allTestsPassed = true;
    var expected;
    var actual;
    
    ///////////////
    //Sanity Checks
    ///////////////
    
    allTestsPassed = allTestsPassed && expectEquals("Sanity Check char", "a", "a");
    allTestsPassed = allTestsPassed && expectNotEquals("Sanity Check char", "a", "b");
    
    allTestsPassed = allTestsPassed && expectEquals("Sanity Check int", 1, 1);
    allTestsPassed = allTestsPassed && expectNotEquals("Sanity Check int", 1, 0);
    
    allTestsPassed = allTestsPassed && expectEquals("Sanity Check empty array", [[]], [[]]);
    allTestsPassed = allTestsPassed && expectNotEquals("Sanity Check empty array", [[]], []);
    allTestsPassed = allTestsPassed && expectNotEquals("Sanity Check empty array", [[]], [[0]]);
    
    
    expected = [[0,0,0],
                [0,0,0],
                [0,0,0]];
    actual =   [[0,0,0],
                [0,0,0],
                [0,0,0]];
    allTestsPassed = allTestsPassed && expectEquals("Sanity Check, matrix", expected, actual);
    
    expected = [[0,0,0],
                [0,0,0],
                [0,0,0]];
    actual =   [[0,0,0],
                [0,0,0],
                [1,0,0]];
    allTestsPassed = allTestsPassed && expectNotEquals("Sanity Check, matrix", expected, actual);
    
    
    
    expected = [{1:1, 2:1},
                {3:1},
                {0:1}];
    actual = [{1:1, 2:1},
              {3:1},
              {0:1}];
    allTestsPassed = allTestsPassed && expectEquals("Sanity Check, array of sets", expected, actual);
    
    expected = [{1:1, 2:1},
                {3:1},
                {0:1}];
    actual = [{1:1, 2:1},
              {0:1},
              {3:1}];
    allTestsPassed = allTestsPassed && expectNotEquals("Sanity Check, array of sets", expected, actual);
    
    
    expected = 10;
    actual = [1,2,3,4].reduce(function(previousValue, currentValue, currentIndex, array) {
        return previousValue + currentValue;
    });
    allTestsPassed = allTestsPassed && expectEquals("Sanity Check, array reduce", expected, actual);
    
    
    expected = 10;
    actual = Math.max(10, Math.min(1,3));
    allTestsPassed = allTestsPassed && expectEquals("Sanity Check, Min and Max 1", expected, actual);
    
    expected = 1;
    actual = Math.max(0, Math.min(1,3));
    allTestsPassed = allTestsPassed && expectEquals("Sanity Check, Min and Max 2", expected, actual);
    
    
    
    ////////////////
    //Test Utilities
    ////////////////
    expected = [[1,2,3],
                [4,5,6],
                [7,8,9]];
    actual = addMatrices(
                         [
                          [[0,1,1],
                           [0,0,0],
                           [4,-10,4]],
                          
                          [[1,1,2],
                           [4,5,6],
                           [3,18,5]]
                          ]
                         );
    allTestsPassed = allTestsPassed && expectEquals("addMatrices", expected, actual);
    
    
    
    
    //Test RemoveDups
    expected = ["A", "B", "C"];
    actual = removeDups(["A", "B", "A", "C"]);
    allTestsPassed = allTestsPassed && expectEquals("RemoveDups", expected, actual);
    
    
    //Test GenerateMatrix
    expected = [[0,0,0],
                [0,0,0],
                [0,0,0]];
    actual = generateZeroMatrix(3);
    allTestsPassed = allTestsPassed && expectEquals("generateZeroMatrix", expected, actual);
    
    
    /////////////////////////
    //Test Core Functionality
    /////////////////////////
    
    
    
    //Test getLegalCandidates
    expected = ["A1", "A2", "B", "C"];
    actual = getLegalCandidates([["A1", "A2"],["B"],["C"]]);
    allTestsPassed = allTestsPassed && expectEquals("getLegalCandidates Basic", expected, actual);
    
    expected = ["A"];
    actual = getLegalCandidates([["A", "A"],["A"],["A"]]);
    allTestsPassed = allTestsPassed && expectEquals("getLegalCandidates Dupes", expected, actual);
    
    
    //Test packCandidates
    expected = [["A", "B"]];
    actual = packCandidates([[["A", "B"],["C"]], [["C"], ["A", "B"]]]);
    allTestsPassed = allTestsPassed && expectEquals("packCandidates 1", expected, actual);
    
    expected = [["A", "B"], ["C", "D"]];
    actual = packCandidates([[["A", "B"],["E"],["C", "D"]], [["E"], ["A", "B", "C", "D"]]]);
    allTestsPassed = allTestsPassed && expectEquals("packCandidates 2", expected, actual);
    
    
    //Test packBallots
    expected = [[["A"],["C"]], [["C"], ["A"]]];
    actual = packBallots([[["A", "B"],["C"]], [["C"], ["A", "B"]]]);
    allTestsPassed = allTestsPassed && expectEquals("packBallots 1", expected, actual);
    
    expected = [[["A"],["E"],["C"]], [["E"], ["A", "C"]]];
    actual = packBallots([[["A", "B"],["E"],["C", "D"]], [["E"], ["A", "B", "C", "D"]]]);
    allTestsPassed = allTestsPassed && expectEquals("packBallots 2", expected, actual);
    
    
    //Test processBallot
    expected = [{0:1}, {1:1}, {2:1}];
    actual = processBallot([["A"],["B"],["C"]],  ["A", "B", "C"]);
    allTestsPassed = allTestsPassed && expectEquals("processBallot Basic", expected, actual);
    
    expected = [{0:1}, {1:1}, {2:1}, {3:1, 4:1, 5:1}]
    actual = processBallot([["A"],["B"],["C"]],  ["A", "B", "C", "X", "Y", "Z"]);
    allTestsPassed = allTestsPassed && expectEquals("processBallot Unmentioned Candidates", expected, actual);
    
    expected = [{2:1}, {0:1}, {1:1}];
    actual = processBallot([["C"],["D"],["C"],["\n"],["A"]],  ["A", "B", "C"]);
    allTestsPassed = allTestsPassed && expectEquals("processBallot Complex", expected, actual);
    
    
    
    
    //Test convertToMatrix
    expected = [[0,1,1],
                [0,0,1],
                [0,0,0]];
    actual = convertProcessedBallotToMatrix([{0:1},{1:1},{2:1}], 3);
    allTestsPassed = allTestsPassed && expectEquals("convertToMatrix", expected, actual);
    
    //Test processAndConvert
    expected = [[0,1,1],
                [0,0,1],
                [0,0,0]];
    actual = processAndConvert([["A"],["B"],["C"]], ["A", "B", "C"]);
    allTestsPassed = allTestsPassed && expectEquals("processAndConvert Basic", expected, actual);
    
    expected = [[0,0,1,1],
                [0,0,1,1],
                [0,0,0,1],
                [0,0,0,0]];
    actual = processAndConvert([["A1", "A2"],["B", " "],["C", " "]], ["A1", "A2", "B", "C"]);
    allTestsPassed = allTestsPassed && expectEquals("processAndConvert Tie for First", expected, actual);
    
    
    expected = [[0,0,0],
                [1,0,0],
                [1,1,0]];
    actual = processAndConvert([["Z"],["Y"],["X"]], ["X", "Y", "Z"]);
    allTestsPassed = allTestsPassed && expectEquals("processAndConvert Z to A", expected, actual);
    
    
    expected = [[0,1,1],
                [0,0,1],
                [0,0,0]];
    actual = processAndConvert([["A"],["B", "B"],["C"]], ["A", "B", "C"]);
    allTestsPassed = allTestsPassed && expectEquals("processAndConvert Dupe In Middle", expected, actual);  
    
    
    expected = [[0,1,1],
                [0,0,1],
                [0,0,0]];
    actual = processAndConvert([["A"],["B"],["C", "B"]], ["A", "B", "C"]);
    allTestsPassed = allTestsPassed && expectEquals("processAndConvert In Different Ranks", expected, actual);    
    
    
    expected = [[0,1,1],
                [0,0,1],
                [0,0,0]];
    actual = processAndConvert([["IllegalCandidate"],["A"],["B"],["B"]], ["A", "B", "C"]);
    allTestsPassed = allTestsPassed && expectEquals("processAndConvert Illegal Candidate", expected, actual);      
    
    expected = [[0,0,0],
                [0,0,0],
                [0,0,0]];
    actual = processAndConvert([["X"],["Y"],["Z"]], ["A", "B", "C"]);
    allTestsPassed = allTestsPassed && expectEquals("processAndConvert All Illegal Candidates", expected, actual);      
    
    /////////////////////////
    //Test Shulze
    /////////////////////////
    
    allTestsPassed = allTestsPassed && testShulze();
    
    /////////////////////////
    //Test LUNCHVOTE
    /////////////////////////
    
    //Test LunchVote  
    expected = [["E"], ["A"], ["C"], ["B"], ["D"]];  
    actual = LUNCHVOTE.apply(this, shulzeWikiExampleTestBallots());
    allTestsPassed = allTestsPassed && expectEquals("LunchVote Shulze Wiki Example", expected, actual);
    
    expected = [["A"], ["B"], ["C"]];
    actual = LUNCHVOTE([["A"],["B"],["C"]], [["A"],["B"],["C"]]);
    allTestsPassed = allTestsPassed && expectEquals("LunchVote Basic", expected, actual);
    
    /////////////////////////
    //Test LUNCHVOTE_RANK
    /////////////////////////
    expected = [["Results:"], ["1"], ["2"], ["3"]];
    actual = LUNCHVOTE_RANK([["A"],["B"],["C"]], [["1"],["2"],["3"]]);
    allTestsPassed = allTestsPassed && expectEquals("LUNCHVOTE_RANK Basic Example", expected, actual);
    
    
    var args = [[["A"],["B"],["C"],["D"],["E"]]];
    var ballots = shulzeWikiExampleTestBallotsRanks();  
    for (i=0; i<ballots.length; i++) {
        args.push(ballots[i]);
    }
    
    expected = [["Results:"], ["2"], ["4"], ["3"], ["5"], ["1"]];  
    actual = LUNCHVOTE_RANK.apply(this, args);
    allTestsPassed = allTestsPassed && expectEquals("LUNCHVOTE_RANK Shulze Wiki Example", expected, actual);
    
    
    if (allTestsPassed) {
        Logger.log("All Tests Passed!");
    }
    
}

