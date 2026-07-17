replaceEvery(
  "    if (chosen === 'bird' || chosen === 'helicopter') z = rand(-9, 2.5);",
  `    if (chosen === 'bird' || chosen === 'helicopter') {
      const upperCrossingChance = this.isMobile ? 0.84 : 0.76;
      z = Math.random() < upperCrossingChance ? rand(-25, -11) : rand(-9, 1.5);
    }`,
  'aves e helicópteros aparecem principalmente na parte superior'
);
