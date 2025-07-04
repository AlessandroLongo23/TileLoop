// the id refers to the numbering system used by https://probabilitysports.com/tilings.html

export const tilingRules = [
	{
		title: "1-Uniform (Regular)",
		id: "1Ur",
		dual: true,
		rules: [
			{
				id: 1,
				name: "triangular",
				cr: "3^6",
				rulestring: "3/r60/r(h2)",
				dualname: "hexagonal",
			},
			{
				id: 2,
				name: "square",
				cr: "4^4",
				rulestring: "4-4-0,4/r90/m(v2)",
				dualname: "square",
				alternatives: [
					"4/m45/r(h1)",
					"4-4-0,4/r90/m(v2)"
				]
			},
			{
				id: 3,
				name: "hexagonal",
				cr: "6^3",
				rulestring: "6/r60/r(h1)",
				dualname: "triangular"
			}
		]
	},
	{
		title: "1-Uniform (Semiregular)",
		id: "1Usr",
		dual: true,
		rules: [
			{
				id: 1,
				name: "Snub trihexagonal",
				cr: "3^4.6",
				rulestring: "6-3-3/r60/r(h5)",
				dualname: "floret pentagonal"
			},
			{
				id: 2,
				name: "Elongated triangular",
				cr: "3^3.4^2",
				rulestring: "4-3/m90/r(h2)",
				dualname: "prismatic pentagonal"
			},
			{
				id: 3,
				name: "Snub square",
				cr: "3^2.4.3.4",
				rulestring: "4-3-3,0,0,0,4/r90/r(h2)",
				dualname: "cairo pentagonal"
			},
			{
				id: 4,
				name: "Rhombitrihexagonal",
				cr: "3.4.6.4",
				rulestring: "6-4-3/m30/r(c2)",
				dualname: "deltoidal trihexagonal"
			},
			{
				id: 5,
				name: "Trihexagonal",
				cr: "(3.6)^2",
				rulestring: "6-3-6/m30/r(v4)",
				dualname: "rhombille"
			},
			// {
			// 	id: 6,
			// 	name: "Truncated hexagonal",
			// 	cr: "3.12^2",
			// 	rulestring: "12-3/m30/r(h3)",
			// 	dualname: "triakis triangular"
			// },
			// {
			// 	id: 7,
			// 	name: "Truncated trihexagonal",
			// 	cr: "4.6.12",
			// 	rulestring: "12-6,4/m30/r(c2)",
			// 	dualname: "kisrhombille"
			// },
			// {
			// 	id: 8,
			// 	name: "Truncated square",
			// 	cr: "4.8^2",
			// 	rulestring: "8-4/m90/r(h4)",
			// 	dualname: "tetrakis square",
			// 	golRules: {
			// 		standard: [],
			// 		dual: [
			// 			{
		
			// 				rule: "B48/S234",
			// 				description: "",
			// 			},
			// 			{
		
			// 				rule: "B1/S1/G50",
			// 				description: "",
			// 			}
			// 		]
			// 	}
			// },
		]
	},
	{
		title: "2-Uniform",
		id: "2U",
		dual: true,
		rules: [
			{
				id: 1,
				name: "Rhombitrihexagonal",
				cr: "3^6;3^2.4.3.4",
				rulestring: "3-0,4-0,3/m30/r(c3)",
			},
			{
				id: 2,
				name: "Truncated hexagonal (dissected a)",
				cr: "3.4.6.4;3^2.4.3.4",
				rulestring: "6-4-3,3/m30/r(h1)",
			},
			{
				id: 3,
				name: "Truncated hexagonal (dissected b)",
				cr: "3.4.6.4;3^3.4^2",
				rulestring: "6-4-3-3/m30/r(h5)",
			},
			{
				id: 4,
				cr: "3.4.6.4;3.4^2.6",
				rulestring: "6-4-3,4-6/m30/r(c4)",
			},
			{
				id: 5,
				rulestring: "6-3/r120/m(h1)",
			},
			// {
			// 	id: 6,
			// 	name: "Diminished rhombitrihexagonal",
			// 	cr: "4.6.12;3.4.6.4",
			// 	rulestring: "12-4,6-3/m30/r(c3)",
			// },
			// {
			// 	id: 7,
			// 	cr: "3^6;3^2.4.12",
			// 	rulestring: "12-3,4-3/m30/r(c3)",
			// },
			// {
			// 	id: 8,
			// 	cr: "3.12^2;3.4.3.12",
			// 	rulestring: "12-0,3,3-0,0,4/r90/r(h1)",
			// },
			{
				id: 9,
				name: "hexagonal (2/3 dissected)",
				cr: "[3^6;3^4.6]_1",
				rulestring: "6-3,3-3/m30/r(h1)",
			},
			{
				id: 10,
				cr: "[3^6;3^4.6]_2",
				rulestring: "6-3-3,3-0,3/r60/r(h8)",
			},
			{
				id: 11,
				cr: "3^2.6^2;3^4.6",
				rulestring: "6-3/m90/r(h1)",
			},
			{
				id: 12,
				cr: "3.6.3.6;3^2.6^2",
				rulestring: "6-3,6/m90/r(h3)",
			},
			{
				id: 13,
				cr: "[3.4^2.6;3.6.3.6]_2",
				rulestring: "6-3,4-6-3,4-6,4/m90/r(c6)",
			},
			{
				id: 14,
				cr: "[3.4^2.6;3.6.3.6]_1",
				rulestring: "6-3,4/m90/r(h4)",
			},
			{
				id: 15,
				cr: "[3^3.4^2;3^2.4.3.4]_1",
				rulestring: "4-3,3-4,3/r90/m(h3)",
			},
			{
				id: 16,
				cr: "[3^3.4^2;3^2.4.3.4]_2",
				rulestring:	"4-3,3,3-4,3/r(c2)/r(h13)/r(h45)",
			},
			{
				id: 17,
				cr: "[4^4;3^3.4^2]_1",
				rulestring: "4-3/m(h4)/m(h3)/r(h2)",	
			},
			{
				id: 18,
				cr: "[4^4;3^3.4^2]_2",
				rulestring: "4-4-3-3/m90/r(h3)",	
			},
			{
				id: 19,
				cr: "[3^6;3^3.4^2]_1",
				rulestring: "4-3,4-3,3/m90/r(h3)",	
			},
			{
				id: 20,
				cr: "[3^6;3^3.4^2]_2",
				rulestring: "4-3-3-3/m90/r(h7)/r(h5)",	
			},
		]
	},
	{
		title: "3-Uniform (2 Vertex Types)",
		id: "3U2",
		dual: true,
		rules: [
			{
				id: 1,
				cr: "(3.4.6.4)^2;3.4^2.6",
				rulestring: "6-4-3,4-6,3/m30/r(c2)"
			},
			{
				id: 2,
				cr: "[(3^6)^2;3^4.6]_1",
				rulestring: "6-3-3/m30/r(v3)",
			},
			{
				id: 3,
				cr: "[(3^6)^2;3^4.6]_2",
				rulestring: "6-3-3-0,3-0,0,3/m30/r(v2)",
			},
			{
				id: 4,
				cr: "[(3^6)^2;3^4.6]_3",
				rulestring: "6-3-3-0,3,3-0,3-0,3/r60/r(h7)",	
			},
			{
				id: 5,
				cr: "3^6;(3^4.6)^2",
				rulestring: "3-0,3,3-0,6/m90/r(h6)",
			},
			{
				id: 6,
				cr: "3^6;(3^2.4.3.4)^2",
				rulestring: "3-0,4-0,3,3/m30/m(h2)",
			},
			{
				id: 7,
				cr: "(3.4^2.6)^2;3.6.3.6",
				rulestring: "4-6,4-4,3,3/m90/r(h4)",
			},
			{
				id: 8,
				cr: "[3.4^2.6;(3.6.3.6)^2]_1",
				rulestring: "4-6,4-0,3,3/m180/r(v1)/r(h25)",	
			},
			{
				id: 9,
				cr: "[3.4^2.6;(3.6.3.6)^2]_2",
				rulestring: "4-6,4-0,3,3/m90/r(v1)",	
			},
			{
				id: 10,
				cr: "3^2.6^2;(3.6.3.6)^2",
				rulestring: "6-3,0,3,3,3,3/r(h4)/r(v15)/r(v30)",	
			},
			{
				id: 11,
				cr: "(3^4.6)^2;3.6.3.6",
				rulestring: "6-3,3-0,3/r180/r(v1)/r(h12)",	
			},
			{
				id: 12,
				cr: "[3^3.4^2;(4^4)^2]_1",
				rulestring: "4-4-4-3/m90/r(h4)",
			},
			{
				id: 13,
				cr: "[3^3.4^2;(4^4)^2]_2",
				rulestring: "4-4-3/r(h6)/m(h5)/r(h3)",	
			},
			{
				id: 14,
				cr: "[(3^3.4^2)^2;4^4]_1",
				rulestring: "4-4-3-3-4/m90/r(h10)/r(c3)",	
			},
			{
				id: 15,
				cr: "[(3^3.4^2)^2;4^4]_2",
				rulestring: "4-3,4-3,3-4/m90/r(h3)",	
			},
			{
				id: 16,
				cr: "(3^3.4^2)^2;3^2.4.3.4",
				rulestring: "4-4,3,4-3,3,3-3,4-3-4/r180/r(h17)/r(h18)",	
			},
			{
				id: 17,
				cr: "3^3.4^2;(3^2.4.3.4)^2",
				rulestring: "4-3,3-0,4,3/r180/r(h2)/r(h18)",	
			},
			{
				id: 18,
				cr: "[3^6;(3^3.4^2)^2]_1",
				rulestring: "4-3,0,3-3-3/r(h5)/r(h19)/m(h18)",	
			},
			{
				id: 19,
				cr: "[3^6;(3^3.4^2)^2]_2",
				rulestring: "4-3,0,3-3/r(h3)/r(h15)/m(h14)",	
			},
			{
				id: 20,
				cr: "[(3^6)^2;3^3.4^2]_1",
				rulestring: "4-3-3-3-3-3/m90/r(h3)",	
			},
			{
				id: 21,
				cr: "[(3^6)^2;3^3.4^2]_2",
				rulestring: "4-3-3-3-3/m90/r(h2)/m(h22)",	
			}
		]
	},
	{
		title: "3-Uniform (3 Vertex Types)",
		id: "3U3",
		dual: true,
		rules: [
			// {
			// 	id: 22,
			// 	rulestring: "12-6,4-3,3,4/m30/r(c5)",
			// },
			{
				id: 23,
				rulestring: "3-0,4-0,3,6-0,4/r60/m(c2)",
			},
			// {
			// 	id: 24,
			// 	rulestring: "12-3,4,6-3/m60/m(c5)",
			// },
			// {
			// 	id: 25,
			// 	rulestring: "6-4-3,12,3-3/m30/r(h2)",
			// },
			// {
			// 	id: 26,
			// 	rulestring: "6-4-3,3-12-0,0,0,3/m30/r(c2)",
			// },
			// {
			// 	id: 27,
			// 	rulestring: "6-4-3,3-12/r60/r(h10)",
			// },
			// {
			// 	id: 28,
			// 	rulestring: "12-4,3-6,3-0,0,4/m30/r(h11)",
			// },
			// {
			// 	id: 29,
			// 	rulestring: "12-3,4-3-3-3/m30/m(h9)",
			// },
			// {
			// 	id: 30,
			// 	rulestring: "12-3,4-3,3/m30/r(v1)",
			// },
			{
				id: 31,
				rulestring: "6-3-3-0,4-0,3-0,0,3/m30/r(h10)",
			},
			{
				id: 32,
				rulestring: "3-0,4-0,3,4-0,6/m30/r(c5)",
			},
			{
				id: 33,
				rulestring: "6-4-3,4-3,3/m30/r(c5)",
			},
			{
				id: 34,
				rulestring: "6-4-3,3-4,3,3-3/r60/r(v5)",
			},
			{
				id: 35,
				rulestring: "3-0,4-0,3-0,3/m30/r(h6)",
			},
			// {
			// 	id: 36,
			// 	rulestring: "12-4-3,3/m90/r(h6)",
			// },
			{
				id: 37,
				rulestring: "6-4,3-3,0,4-6/m90/r(v5)",
			},
			{
				id: 38,
				rulestring: "6-4,3-3,3,4-0,0,6,3/m90/r(h17)/m(h1)",
			},
			{
				id: 39,
				rulestring: "4-3-3-0,4/r90/r(h3)",
			},
			{
				id: 40,
				rulestring: "4-4-3,4-6/m180/r(c3)/r(h29)",
			},
			{
				id: 41,
				rulestring: "4-4,4-3,4-6/m90/r(c5)/r(v1)",
			},
			{
				id: 42,
				rulestring: "6-3,4-0,4,4-0,0,4/m90/r(h9)",
			},
			{
				id: 43,
				rulestring: "6-4,3,3-4/m(h4)/r180/r(v15)",
			},
			{
				id: 44,
				rulestring: "4-6-3,0,3,4,0,0,3/m90/r(h4)",
			},
			{
				id: 45,
				rulestring: "4-6,4,3-0,3,3,0,6/m(h2)/m",
			},
			{
				id: 46,
				rulestring: "4-6,4-0,3,3/r(h2)/m90/r(c9)",
			},
			{
				id: 47,
				rulestring: "4-6,4-0,3,3-0,0,3,3/m90/m(h13)/m(c1)",
			},
			{
				id: 48,
				rulestring: "6-6-0,3,3,3/r60/r(h2)",
			},
			{
				id: 49,
				rulestring: "6-6,6,3-0,3,3/m180/r(h8)/r(h49)",
			},
			{
				id: 50,
				rulestring: "6-3-3/m180/r(h3)/r(h15)",
			},
			{
				id: 51,
				rulestring: "3-0,6/m60/m(c2)",
			},
			{
				id: 52,
				rulestring: "6-3-3,3-0,3,3-0,0,3/r(h7)/r(h29)/r(h29)",
			},
			{
				id: 53,
				rulestring: "3-0,3,6-0,3/m180/r(h6)/r(c6)",
			},
			{
				id: 54,
				rulestring: "6-3-3/m90/r(h2)",
			},
			{
				id: 55,
				rulestring: "3-0,3,3-0,3,6,3/m90/r(v1)/r(v15)",
			},
			{
				id: 56,
				rulestring: "3-0,3-0,6-0,0,3/r60/m(c1)",
			},
			{
				id: 57,
				rulestring: "3-0,3-0,6/r60/r(v4)",
			},
			{
				id: 58,
				rulestring: "4-4-3-3/m90/r(h7)/r(v1)",
			},
			{
				id: 59,
				rulestring: "4-4-3-3-3/m90/r(h9)/r(h3)",
			},
			{
				id: 60,
				rulestring: "4-4-3-3-3/m(h9)/r(h1)/r(v1)",
			},
			{
				id: 61,
				rulestring: "4-4-3-3-3/m(h9)/r(h1)/r(h3)",
			}
		]
	},
	// {
	// 	title: "4-Uniform",
	// 	id: "4U",
	// 	dual: true,
	// 	rules: [
	// 		{
	// 			id: 1,
	// 			rulestring: "3-0,6-0,0,6,6-0,0,6,6,6/r60/m(c1)",
	// 		},
	// 		{
	// 			id: 2,
	// 			rulestring: "6-6-0,6,3-0,0,3,3/r60/m(c1)"
	// 		},
	// 		{
	// 			id: 6,
	// 			rulestring: "6-6-0,3,4-0,0,4-0,0,3/m30/m(c5)"
	// 		},
	// 		{
	// 			id: 22,
	// 			rulestring: "6-3-6-0,3/m30/m(h5)"
	// 		},
	// 		{
	// 			id: 25,
	// 			rulestring: "12-4,6-4,3,4-6,4/m30/m(c7)"
	// 		},
	// 		{
	// 			id: 26,
	// 			rulestring: "12-4,6-4,3,6-0,3,0,3/m30/m(h3)"
	// 		},
	// 		{
	// 			id: 27,
	// 			rulestring: "12-4,6-4,3-3/m30/m(h7)"
	// 		},
	// 		{
	// 			id: 108,
	// 			cr: "[3.4.3.12;3.4.6.4;(3^2.4.3.4)^2]",
	// 			rulestring: "12-3,3-4-3,6-0,4-0,3/m30/r(c7)"
	// 		},
	// 		{
	// 			id: 118,
	// 			rulestring: "3'-6-6,3,3-0,3,3,6-0,0,3,3,3-0,0,0,3/m60/r(c7)[120]"
	// 		},
	// 		{
	// 			id: 119,
	// 			rulestring: "6-3-6-3,3-0,3,3/r60/r(h13)"
	// 		},
	// 		{
	// 			id: 132,
	// 			rulestring: "4-3-3-0,4-12,3/r90/r(h12)"
	// 		}
	// 	]
	// },
	// {
	// 	title: "5-Uniform",
	// 	id: "5U",
	// 	dual: true,
	// 	rules: [
	// 		{
	// 			id: 235,
	// 			rulestring: "6-3,6-3,3-0,3-0,3-0,3-0,0,0,0,3,3-0,0,0,0,0,6/r120/r(h5)"
	// 		},
	// 		{
	// 			id: 246,
	// 			rulestring: "3-0,3-0,6-0,0,3-0,0,3-0,0,0,3/r60/r(h2)"
	// 		},
	// 		{
	// 			id: 297,
	// 			rulestring: "6-3-3,3-0,3,3-0,3,3,3-0,0,4,4,4-0,0,3/r60/m(c8)"
	// 		},
	// 	]
	// },
	// {
	// 	title: "6-Uniform",
	// 	id: "6U",
	// 	dual: true,
	// 	rules: [
	// 		{
	// 			id: 6,
	// 			rulestring: "6-6-0,6,6-0,3,3,3,3/m30/m(v3)",
	// 		},
	// 		{
	// 			id: 86,
	// 			rulestring: "12-4,6-3,4,12-3,3/m30/m(v2)"
	// 		},
	// 		{
	// 			id: 108,
	// 			rulestring: "12-3,12-0,3,3-0,4,0,0,3/m30/m(c3)"
	// 		},
	// 		{
	// 			id: 316,
	// 			rulestring: "6-3-6-4,3-3,0,4-3/m30/r(h11)"
	// 		},
	// 		{
	// 			id: 372,
	// 			rulestring: "6-3-6-4,3-3,0,4-0,3,6-0,0,0,3/m30/m(h1)"
	// 		},
	// 		{
	// 			id: 379,
	// 			rulestring: "3-0,4-0,3,4-0,6,4-0,6,3-0,3,0,3/m30/r(h17)"
	// 		},
	// 		{
	// 			id: 585,
	// 			rulestring: "6-3-3,3-0,3,6-0,3,3,3-0,0,3,6/r60/r(h3)"
	// 		},
	// 		{
	// 			id: 611,
	// 			rulestring: "12-3,4-3,3-4,3-0,3-0,3-0,3/m30/r(v8)"
	// 		}
	// 	]
	// },
	// {
	// 	title: "concave 1-Uniform",
	// 	id: "c1U",
	// 	dual: true,
	// 	rules: [
	// 		{
	// 			rulestring: "6(a)-3/r60/r(h4)",
	// 		},
	// 		{
	// 			rulestring: "4(a)-4/r90/r(h4)",
	// 		},
	// 		{
	// 			rulestring: "6-3(a)/r60/r(h2)",
	// 		},
	// 		{
	// 			rulestring: "3(a)-3-3(a)-0,0,3/r120/t(c2)",
	// 		},
	// 	]
	// },
	// {
	// 	title: "concave 2-Uniform",
	// 	id: "c2U",
	// 	dual: true,
	// 	rules: [
	// 		{
	// 			rulestring: "3(30)-3,4-0,6/r120/m(c1)"
	// 		},

	// 		{
	// 			rulestring: "4(18)-5,5,5,5-0,5,4(18)-0,4(18)/r90/m(c4)",
	// 		},
	// 		{
	// 			rulestring: "4(30)-3,3-0,0,4/r90/r(h2)"
	// 		},
	// 		{
	// 			rulestring: "4(30)-6-0,4/r90/m(c1)",
	// 		},
	// 		{
	// 			rulestring: "4(45)-8/r90/m(v5)",
	// 		},
	// 		{
	// 			rulestring: "4(60)-0,3,4-0,4/r90/r(c1)"
	// 		},
	// 		{
	// 			rulestring: "4(120)-3,3-4,0,4(120)/r90/r(c1)"
	// 		},

	// 		{
	// 			rulestring: "6(30)-4/r60/m(c2)",
	// 		},
	// 		{
	// 			rulestring: "{6.2}-3,3/r60/r(h3)"
	// 		},
	// 		{
	// 			rulestring: "{6.2}-3,3-0,3/r60/r(h2)"
	// 		},
	// 		{
	// 			rulestring: "{6.2}-6/r60/m(v1)",
	// 		},
	// 		{
	// 			rulestring: "{6.2}-6-3/r60/m(c2)",
	// 		},
	// 		{
	// 			rulestring: "6(80)-9-0,6(80),9/r60/m(c1)",
	// 		},

	// 		{
	// 			rulestring: "8(15)-3,3-3,4-0,3/r90/m(h1)",
	// 		},
	// 		{
	// 			rulestring: "8(15)-3,3-8,4/r90/m(c4)",
	// 		},

	// 		{
	// 			rulestring: "9-3(20),3-9/r120/t(c1)",
	// 		},

	// 		{
	// 			rulestring: "12-0,4(60)/m45/m(h1)",
	// 		},
	// 		{
	// 			rulestring: "12-3(30)-12/r60/m(v5)",
	// 		},
	// 		{
	// 			rulestring: "{12.5}-3,3-0,3/m30/m(h1)",
	// 		},
	// 		{
	// 			rulestring: "{12.5}-3,3-4,6/m30/m(c2)",
	// 		},

	// 		{
	// 			rulestring: "18-0,18,3(40)-0,3(40)/m30/m(c3)",
	// 		},
	// 	]
	// },
	// {
	// 	title: "concave 3-Uniform",
	// 	id: "c3U",
	// 	dual: true,
	// 	rules: [
	// 		{
	// 			rulestring: "3(30)-3,4-0,0,0,6/r120/m(v8)"
	// 		},

	// 		{
	// 			rulestring: "6(30)-0,4,6(90)/r120/m(c1)",
	// 		},
	// 		{
	// 			rulestring: "6(30)-4-0,3(90)/r60/r(v5)"
	// 		},
	// 		{
	// 			rulestring: "6(48)-5-3(96)-0,5/r60/r(h6)"
	// 		},
	// 		{
	// 			rulestring: "{6.2}-3,3-3,6/r60/r(h5)"
	// 		},	
	// 		{
	// 			rulestring: "{6.2}-6-3,0,3/r60/r(v2)"
	// 		},
	// 		{
	// 			rulestring: "6(75)-8-3(15)/r60/m(c2)",
	// 		},
	// 		{
	// 			rulestring: "6(90)-0,3,4-0,0,0,0,3(30)/r60/r(h1)"
	// 		},

	// 		{
	// 			rulestring: "8(15)-0,3,0,4(60)-0,3/r90/m(h7)",
	// 		},
	// 		{
	// 			rulestring: "8(15)-3,3-4(45)/r90/r(v9)",
	// 		},
	// 		{
	// 			rulestring: "{8.3}-4,4/m45/m(v5)/m(c1)",
	// 		},

	// 		{
	// 			rulestring: "{12.2}-0,3,4-0,0,0,3/r60/r(v2)"
	// 		},
	// 		{
	// 			rulestring: "{12.5}-3,3-3,12/r60/r(h2)"
	// 		},
	// 	]
	// },
	// {
	// 	title: "concave 4-Uniform",
	// 	id: "c4U",
	// 	dual: true,
	// 	rules: [
	// 		{
	// 			rulestring: "{12.3}-4,4-0,3(90),0,6(30)/r60/r(c4)"
	// 		},

	// 		{
	// 			rulestring: "{6.2}-6-3/r60/m(h1)"
	// 		},
	// 		{
	// 			rulestring: "{6.2}-6-3,0,3-0,0,0,3/r60/r(h4)"
	// 		},

	// 		{
	// 			rulestring: "{8.3}-4-8(90)/r90/r(v2)"
	// 		},
	// 		{
	// 			rulestring: "{8.3}-4,4-8-8,4/r90/r(h11)"
	// 		},
	// 		{
	// 			rulestring: "8(75)-3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3-0,4(30)/r(h1)/r(c11)[90]"
	// 		},

	// 		{
	// 			rulestring: "{12.2}-12,4,3/m45/m(v10)"
	// 		},
	// 		{
	// 			rulestring: "{12.5}-3,3,3-4(60),12/r90/r(c2)"
	// 		}
	// 	]
	// },
	// {
	// 	title: "concave 5-Uniform",
	// 	id: "c5U",
	// 	dual: true,
	// 	rules: [
	// 		{
	// 			rulestring: "6-6-0,0,3-0,0,3,0,6-0,0,0,{6.2}-3,3/r60/r(h2)"
	// 		},
	// 		{
	// 			rulestring: "6-3(90),4,3(90)-0,0,0,0,0,3/r/r(h2)/r(v25)"
	// 		},
	// 		{
	// 			rulestring: "6(75)-3,3-8(15)-3,3,3,3,3,3-3(15)/r60/m(c6)"		
	// 		},
	// 		{
	// 			rulestring: "{6.2}-6-3(60)-0,3,3-0,6/r60/r(v2)"
	// 		},
	// 		{
	// 			rulestring: "{12.2}-4,4,3,3-0,3-4,6,4,6/r60/r(c8)"
	// 		},
	// 		{
	// 			rulestring: "{12.3}-3,3,3-3,4,3-3/r60/r(v7)"
	// 		},
	// 		{
	// 			rulestring: "{12.3}-6-0,4(120)/m30/m(h1)"
	// 		}
	// 	]
	// },
	// {
	// 	title: "concave 6-Uniform",
	// 	id: "c6U",
	// 	dual: true,
	// 	rules: [
	// 		{
	// 			rulestring: "3(90)-6,0,0,0,0,4-0,0,0,0,0,0,0,0,0,3/r(h8)/r(h8)/r(h1)"
	// 		},
	// 		{
	// 			rulestring: "4(30)-6-0,3(150)-0,4,0-3(150)-0,4/r90/r(h15)"
	// 		},
	// 		{
	// 			rulestring: "6(90)-3-0,3(150)-3,4-0,6/r60/r(v7)"
	// 		},
	// 		{
	// 			rulestring: "{12.3}-6,3-0,3,4(30)/m30/m(h1)"
	// 		}		
	// 	]
	// },
	// {
	// 	title: "concave 7-Uniform",
	// 	id: "c7U",
	// 	dual: true,
	// 	rules: [
	// 		{
	// 			rulestring: "3(90)-4-3,4,6-3,6,6(90),3/r120/r(h1)"
	// 		},
	// 		{
	// 			rulestring: "6-3(90),4-3-12-0,0,0,0,3,3/m90/m(h7)/r(c2)"
	// 		},
	// 		{
	// 			rulestring: "6(30)-4-3(90),3-4,6,3/r60/m(v2)"
	// 		},
	// 		{
	// 			rulestring: "6(75)-3,3-8(15)-3,3,3,3,3,3-3(15)-8,6(75)/r60/m(c2)"
	// 		},
	// 		{
	// 			rulestring: "12-3,3(150),3-3,0,0,3/m90/m(h14)/m(v5)"
	// 		}
	// 	]
	// },
	// {
	// 	title: "concave k-Uniform",
	// 	id: "ckU",
	// 	dual: true,
	// 	rules: [
	// 		{
	// 			rulestring: "12-3,3-4,4-6,6-4(30),4(30)-3,3,3,3,3,3-3,3,3,3,3-3,3,0,0,3,3/m30/m(h2)"
	// 		},
	// 		{
	// 			rulestring: "12-3,3-4,4-6,6-4(30),4(30)-3,3,3,3,3,3-3,3,3,3,3-3,3,0,0,6/m30/m(h2)"
	// 		},
	// 		{
	// 			rulestring: "12-3,3,3-4,4,4-3,3,3,3-0,12,4,3-0,0,0,0,0,0,4,3(30)-0,0,0,0,0,0,3(30),3/r60/r(c4)"
	// 		},
	// 		{
	// 			rulestring: "12-4,4-3,0,3(30)-6,0,3-0,3,3,0,4(30)-0,0,0,0,4,3-0,0,0,0,0,3/m30/r(h4)"
	// 		},
	// 		{
	// 			rulestring: "12(60)-4,4,4-3,3-12,4,6/m45/m(c7)"
	// 		},
	// 		{
	// 			rulestring: "12(60)-4,4,4-3,3,3,3-12,4,3/m45/m(v14)"
	// 		},
	// 		{
	// 			rulestring: "12(60)-4,4,4-3,3,3,3-12,4,3-0,0,0,4,3(30)-0,0,0,3(30),3/r60/r(c2)"
	// 		},
	// 		{
	// 			rulestring: "12(60)-4,4,4,4-3,3,3,3,3,3-0,0,0,0,0,4(120)/r90/m(h9)"
	// 		},
	// 		{
	// 			rulestring: "{12.2}-12,4,3-0,0,0,4,3(30)-0,0,0,3(30),3/r60/r(c1)"
	// 		},
	// 		{
	// 			rulestring: "{12.3}-3,3,3,3-0,12,4,3-0,0,0,0,0,0,4,3(30)-0,0,0,0,0,0,3(30),3/r60/r(c2)"
	// 		},
	// 		{
	// 			rulestring: "{12.3}-6,6-4(30),4(30)-3,3,3,3-3,0,0,3-0,0,3,6/m30/m(h1)"
	// 		}
	// 	]
	// }
]
