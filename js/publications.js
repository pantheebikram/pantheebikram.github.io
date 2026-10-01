/* Publication list. Edit this file to add or update papers.
   type: "journal" | "conference" | "preprint" | "working"
   links: any of { pdf, arxiv, doi, url, code, slides } */
window.PUBLICATIONS = [
  {
    year: 2026,
    type: "journal",
    title: "A unified framework for siting Level 2 electric vehicle charging infrastructure",
    authors: ["F. Ayaburi", "Y. Wu", "K. Bamwisho", "B. Panthee", "A. M. Newman", "H. Choi", "C. Harper", "A. Pandey"],
    venue: "Transportation Research Part D: Transport and Environment, vol. 156",
    highlight: "Mixed-integer siting model balancing equity, demand, and cost with transformer-derived grid-capacity limits; Pareto analysis for Pittsburgh and Seattle.",
    links: { url: "https://www.sciencedirect.com/science/article/abs/pii/S1361920926001264" },
    bibkey: "ayaburi2026unified"
  },
  {
    year: 2026,
    type: "preprint",
    title: "Grid-ECO: Grid Aware Electric Vehicle Charging Stations Placement Optimizer",
    authors: ["B. Panthee", "H. Yang", "C. D. Harper", "A. Pandey"],
    venue: "arXiv preprint arXiv:2602.12473",
    highlight: "Mixed-integer bilinear program solved by spatial branch-and-bound with sequential bound tightening: 0.00% gap on all Seattle instances, max 753 s.",
    links: { arxiv: "https://arxiv.org/abs/2602.12473", pdf: "https://arxiv.org/pdf/2602.12473", doi: "https://doi.org/10.48550/arXiv.2602.12473" },
    bibkey: "panthee2026gridECO"
  },
  {
    year: 2025,
    type: "conference",
    title: "Solving Three-phase AC Infeasibility Analysis to Near-zero Optimality Gap",
    authors: ["B. Panthee", "A. Pandey"],
    venue: "59th Hawaii International Conference on System Sciences (HICSS-59); arXiv:2508.15937",
    highlight: "Bilinear reformulation + spatial B&B with bound tightening; optimality gap < 10⁻⁴ on 5,000+ node grids; presolve cuts compute time by up to 97%.",
    links: { arxiv: "https://arxiv.org/abs/2508.15937", pdf: "https://arxiv.org/pdf/2508.15937" },
    bibkey: "panthee2025threephase"
  },
  {
    year: 2026,
    type: "working",
    title: "Solving Distribution Grid State-Estimation to Near-zero Optimality Gap",
    authors: ["B. Panthee"],
    venue: "Manuscript in preparation",
    highlight: "Extends the global-optimization pipeline to three-phase distribution system state estimation.",
    links: {},
    bibkey: "panthee2026dse"
  },
  {
    year: 2024,
    type: "working",
    title: "Optimal Allocation of Electric Vehicle Charging Stations",
    authors: ["B. Panthee"],
    venue: "Technical work, University of Vermont",
    highlight: "Early study that led to the Grid-ECO formulation.",
    links: {},
    bibkey: "panthee2024evcs"
  }
];
