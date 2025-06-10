export const toBinary = (number, digits, base) => {
    let binary = [];
    for (let i = 0; i < digits; i++) {
        binary.push(number % base);
        number = Math.floor(number / base);
    }
    return binary.reverse();
}

export const generatePossibleConfigurations = (n, m) => {
    const uniqueConfigurations = new Set();
    const totalConfigurations = Math.pow(m, n);
    
    for (let i = 0; i < totalConfigurations; i++) {
        const binary = toBinary(i, n, m);
        const [minConfig, mirrored, turns] = binary.cycleToMinimumLexicographicalOrder();
        
        const configKey = minConfig.join(',');
        uniqueConfigurations.add(configKey);
    }
    
    const uniqueBinaries = Array.from(uniqueConfigurations).map(key => 
        key.split(',').map(Number)
    );
    
    return uniqueBinaries;
}