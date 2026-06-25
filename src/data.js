// Project records that drive the Work index and Project detail screens.
// Add a project by appending an object here; `index` controls ordering and
// the "next project" link. `hero` is optional — only projects with a render
// show a hero plate. Paths are absolute against /public.
export const SAMPLE_PROJECTS = [
  {
    slug: "cantilever-mount",
    index: 1,
    title: "Cantilever Mount",
    discipline: "Mechanical",
    year: "2024",
    lede: "A monitor stand machined from a single billet of 6061 aluminium, finished by hand at the bench.",
    // Placeholder wireframe — drop the real render at /public/assets/projects/
    // and point this at it (e.g. "/assets/projects/monitor-stand.png").
    hero: "/assets/projects/monitor-stand.svg",
    meta: [
      { label: "Discipline", value: "Mechanical" },
      { label: "Year",       value: "2024" },
      { label: "Material",   value: "6061 aluminium" },
      { label: "Process",    value: "3-axis CNC · anodize" },
      { label: "Tools",      value: "Fusion 360 · Haas VF-2" },
    ],
    body: [
      "The brief was the lightest possible monitor stand that could carry a 27-inch panel without complaining. The result is a pair of triangulated A-frames bridged by a base plate — a structure that owes more to a truss-bridge than to a piece of furniture.",
      "Pockets were laid out from a first-principles stress analysis. Every visible pocket is doing real work; nothing is there for ornament. The radii are the smallest the end mills could comfortably hold.",
      "Edges were broken by hand with a deburring tool after the part came off the machine, then bead-blasted and anodized matte black. The natural shine at the chamfers is the only finish detail not specified in the CAD.",
    ],
  },
  {
    slug: "six-axis-wrist",
    index: 2,
    title: "Six-axis Wrist",
    discipline: "Robotics",
    year: "2024",
    lede: "A compact differential wrist for a desktop manipulator arm. Two motors, three degrees of freedom, one printed gear train.",
    meta: [
      { label: "Discipline", value: "Robotics" },
      { label: "Year",       value: "2024" },
      { label: "Process",    value: "SLS nylon · steel hardware" },
    ],
  },
  {
    slug: "folded-sconce",
    index: 3,
    title: "Folded Sconce",
    discipline: "Industrial",
    year: "2023",
    lede: "A wall lamp from a single sheet of 1mm stainless. Cut flat, folded once.",
    meta: [
      { label: "Discipline", value: "Industrial" },
      { label: "Year",       value: "2023" },
      { label: "Process",    value: "Laser cut · hand fold" },
    ],
  },
  {
    slug: "rotary-press",
    index: 4,
    title: "Rotary Press",
    discipline: "Mechanical",
    year: "2022",
    lede: "A bench-top press for forming pewter blanks. 4-ton capacity, hand-cranked, no electronics.",
    meta: [
      { label: "Discipline", value: "Mechanical" },
      { label: "Year",       value: "2022" },
    ],
  },
  {
    slug: "soft-gripper",
    index: 5,
    title: "Soft Gripper",
    discipline: "Robotics",
    year: "2022",
    lede: "A pneumatic gripper cast in silicone. Three fingers, one chamber, four pounds of payload.",
    meta: [
      { label: "Discipline", value: "Robotics" },
      { label: "Year",       value: "2022" },
    ],
  },
];

// Tools & skills shown in the home-page marquee. `logo` is a placeholder mark
// — drop a real logo image at /public/assets/skills/<slug>.svg (or .png/.svg)
// and the band picks it up automatically.
export const SKILLS = [
  { name: "SolidWorks", slug: "solidworks", logo: "/assets/skills/solidworks.png" },
  { name: "Onshape",    slug: "onshape",    logo: "/assets/skills/onshape.png" },
  { name: "Markdown",   slug: "markdown",   logo: "/assets/skills/markdown.png" },
  { name: "C++",        slug: "cpp",        logo: "/assets/skills/cpp.png" },
  { name: "GitHub",     slug: "github",    logo: "/assets/skills/github.png" },
  { name: "KiCad",      slug: "kicad",      logo: "/assets/skills/kicad.png" },
  { name: "Fusion 360", slug: "fusion-360", logo: "/assets/skills/fusion-360.png" },
  { name: "Inventor",   slug: "inventor",   logo: "/assets/skills/inventor.png" },
];
