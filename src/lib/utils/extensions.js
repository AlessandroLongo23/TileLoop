Array.prototype.next = function(i, j = 1) {
    return this[(i + j) % this.length];
}

Array.prototype.prev = function(i, j = 1) {
    return this[(i - j + this.length * 100) % this.length];
}

Array.prototype.compare = function(other) {
    if (this.length !== other.length) return this.length - other.length;

    for (let i = 0; i < this.length; i++)
        if (this[i] !== other[i]) return this[i] - other[i];

    return 0;
}

Array.prototype.rotate = function(i = 1) {
    let temp = [...this];
    return temp.slice(i).concat(temp.slice(0, i));
}

Array.prototype.cycleToMinimumLexicographicalOrder = function() {
    let temp = [...this];
    let min = [...this];
    let mirrored = false;
    let turns = 0;
    for (let j = 0; j < 2; j++) {
        for (let i = 0; i < temp.length; i++) {
            let rotated = temp.rotate(i);
            if (rotated.compare(min) < 0) {
                min = rotated;
                turns = i;
                mirrored = j == 1;
            }
        }

        temp = [...this].reverse();
    }

    return [min, mirrored, turns];
}

Array.prototype.getSimmetries = function() {
    let simmetries = new Set();
    for (let i = 0; i < this.length; i++) {
        let rotated = this.rotate(i);
        if (rotated.palidrome()) {
            simmetries.add('axial');
            break;
        }
    }

    let divisors = getDivisors(this.length);
    for (let divisor of divisors) {
        let isSimmetric = true;
        let step = this.length / divisor;
        for (let i = 0; i < step; i++) {
            for (let j = 0; j < this.length; j += step) {
                if (this[i] != this[j]) {
                    isSimmetric = false;
                    break;
                }
            }
        }

        if (isSimmetric) {
            simmetries.add(divisor);
        }
    }

    return simmetries;
}

function getDivisors(n) {
    let divisors = [];
    for (let i = 1; i <= n; i++) {
        if (n % i == 0) divisors.push(i);
    }
    return divisors;
}

Array.prototype.palidrome = function() {
    return this.slice().reverse().isEqual(this);
}

Array.prototype.fromBase = function(base) {
    let result = 0;
    for (let i = 0; i < this.length; i++) {
        result += this[i] * Math.pow(base, this.length - i - 1);
    }
    return result;
}

Array.prototype.cyclicallyInclude = function(array) {
    if (array.length > this.length) return false;
    if (array.some(a => !this.includes(a))) return false;
    
    for (let i = 0; i < this.length; i++) {
        let match = true;
        for (let j = 0; j < array.length; j++) {
            if (this[(i + j) % this.length] != array[j]) {
                match = false;
                break;
            }
        }
        if (match) return true;
    }

    return false;
}

Array.prototype.pickRandom = function(weights = Array.from({ length: this.length }, () => 1 / this.length)) {
    let sum = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * sum;
    let cumulative = 0;
    for (let i = 0; i < this.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative) return this[i];
    }
}

String.prototype.count = function(char) {
    return this.split(char).length - 1;
}

Array.prototype.findSubsequenceStartingIndex = function(subsequence) {
    if (subsequence.length > this.length) return [];

    let startingIndexes = [];
    for (let i = 0; i < this.length; i++) {
        let match = true;
        for (let j = 0; j < subsequence.length; j++) {
            if (this[(i + j) % this.length] != subsequence[j]) {
                match = false;
                break;
            }
        }

        if (match) startingIndexes.push(i);
    }

    return startingIndexes;
}

Array.prototype.isEqual = function(array) {
    if (this.length !== array.length) return false;
    for (let i = 0; i < this.length; i++)
        if (this[i] !== array[i]) return false;
    return true;
}

Array.prototype.isEqualOrChiral = function(array) {
    if (this.length !== array.length) return false;
    
    for (let i = 0; i < this.length; i++) {
        let rotated = this.slice(i).concat(this.slice(0, i));
        if (rotated.isEqual(array)) return true;
    }

    let reversed = this.slice().reverse();
    for (let i = 0; i < this.length; i++) {
        let rotated = reversed.slice(i).concat(reversed.slice(0, i));
        if (rotated.isEqual(array)) return true;
    }

    return false;
}