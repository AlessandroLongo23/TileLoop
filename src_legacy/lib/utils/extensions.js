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

Array.prototype.isAxialSymmetric = function() {
    let isSymmetric = false;
    let subarrayLength = this.length / 2 + 1;
    for (let i = 0; i < this.length; i++) {
        if (this.subarray(i, subarrayLength).isEqual(this.subarray(i, -subarrayLength)))
            isSymmetric = true;
    }

    return isSymmetric;
}

Array.prototype.subarray = function(start, offset) {
    let subarray = [];
    if (offset > 0) {
        for (let i = 0; i < offset; i++) {
            subarray.push(this.next(start, i));
        }
    } else {
        for (let i = 0; i < -offset; i++) {
            subarray.push(this.prev(start, i));
        }
    }

    return subarray;
}

Array.prototype.getSimmetries = function() {
    let simmetries = [];
    let temp = [...this];

    for (let i = 0; i < temp.length; i++) {
        let rotated = temp.rotate(i);
        if (rotated.palidrome()) {
            if (!simmetries.some(s => s.type == 'axial' && s.subtype == 'vertex')) {
                simmetries.push({
                    type: 'axial',
                    subtype: 'vertex',
                });
            }
        }
    }

    if (this.isAxialSymmetric()) {
        simmetries.push({
            type: 'axial',
            subtype: 'edge',
        });
    }

    // if (temp.length % 2 == 0) {
    //     temp.push(temp[0]);

    //     for (let i = 0; i < temp.length; i++) {
    //         let rotated = temp.rotate(i);
    //         if (rotated.palidrome()) {
    //             if (!simmetries.some(s => s.type == 'axial' && s.subtype == 'edge')) {
    //                 simmetries.push({
    //                     type: 'axial',
    //                     subtype: 'edge',
    //                 });
    //             }
    //         }
    //     }
    // }

    let divisors = getDivisors(this.length).filter(d => d != 1);
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
            simmetries.push({
                type: 'rotational',
                angle: 360 / divisor,
            });
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
    for (let i = 0; i < this.length; i++)
        if (this[i] != this[this.length - i - 1])
            return false;

    return true;
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

Array.prototype.simmetrize = function(center = null) {
    if (center == null) {
        let simmetrized = [];
        for (let i = 0; i < this.length / 2 + 1; i++) {
            simmetrized.push(this[this.length - i - 1]);
        }
        return simmetrized;
    } else {
        let simmetrized = [];
        for (let i = center; i < this.length + center; i++) {
            simmetrized.push(this[(center - (i - center) + this.length * 100) % this.length]);
        }
        return simmetrized;
    }
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

Array.prototype.sum = function() {
    let sum = 0;
    for (let i = 0; i < this.length; i++) {
        sum += this[i];
    }
    return sum;
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}