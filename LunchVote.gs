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

//Input: Several ranges representing ballots
//Output: A sorted list of legal candidates
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

  
  
  if (allTestsPassed) {
    Logger.log("All Tests Passed!");
  }
              
}

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