// Project records that drive the Work index and Project detail screens.
// Add a project by appending an object here; `index` controls ordering and
// the "next project" link.
//
// Image rule: `preview` (the wireframe render) is the card/index thumbnail;
// `hero` (the regular render) is the full-bleed plate on the detail page.
// Paths are absolute against /public.
//
// The detail page is an engineering case study. Optional fields render their
// section only when present: `summary`, `facts`, `overview`, `goals`,
// `process` ([{ heading, body[] }]), `extraSections` ([{ label, body[] }]),
// `challenges` ([{ title, body }]), `highlights` [], `outcome` [], `gallery`
// ([{ src, caption }]), and `techStack` ([{ label, value }]).
export const SAMPLE_PROJECTS = [
  {
    slug: "frc-987-offseason",
    index: 2,
    title: "FRC Team 987 Offseason Robot",
    discipline: "Robotics",
    year: "Offseason",
    date: "Offseason Project",
    tags: ["FRC", "Onshape", "Parametric CAD", "Mechanical Design"],
    lede: "An offseason FRC robot built to learn parametric design and master sketch workflows in Onshape.",
    preview: "/assets/projects/frc-987-offseason-wireframe.png",
    hero: "/assets/projects/frc-987-offseason.png",
    summary:
      "A collaborative offseason FRC robot I designed as a learning project to sharpen my CAD workflow. The point was less about the robot itself and more about learning parametric design and master sketch techniques in Onshape while taking a full competition robot from a concept to a finished assembly.",
    facts: [
      { label: "Role",          value: "Mechanical Design / CAD" },
      { label: "Collaboration", value: "Team 987 Alumni" },
      { label: "Software",      value: "Onshape" },
    ],
    overview: [
      "I worked on this robot with a Team 987 alumnus during the offseason. We treated it as a chance to slow down and build a better design process instead of rushing to a finished product.",
      "Most of my earlier CAD work was modeled part by part. This time the goal was to design the whole robot in a way that could scale to a large assembly without falling apart every time something changed.",
    ],
    goals: [
      "Learn parametric CAD workflows",
      "Build an entire robot from a single master sketch",
      "Improve design efficiency",
      "Practice packaging several mechanisms together",
      "Develop better CAD organization habits",
    ],
    process: [
      {
        heading: "Planning",
        body: [
          "The whole robot started from one master sketch that set the major geometry and the relationships between subsystems.",
          "Instead of designing each mechanism on its own, I broke the robot into smaller problems while keeping one parametric layout for the overall package. When a dimension or a packaging decision changed, it carried through the rest of the robot instead of breaking it.",
        ],
      },
      {
        heading: "Mechanical Design",
        body: [
          "Each mechanism earned its place in the layout. The ground intake and indexer existed to collect and feed game pieces, and they were positioned first because they set the height everything else had to work around.",
          "A continuous belt-driven elevator carried pieces up the robot, and a carbon fiber scoring arm placed them at the top. Routing the gripper drive through that arm was the part that pushed the design the most.",
          "The gripper used a coaxial drive with a belt transmission running through the arm, so the motor could sit closer to the frame instead of out at the end where its weight would hurt. An endgame climber finished the package.",
          "The harder part was never any single mechanism. It was making all of them share the same volume without fighting each other, which is exactly what the master sketch was there to manage.",
        ],
      },
    ],
    challenges: [
      {
        title: "Learning a fully parametric workflow",
        body: "Designing everything from a master sketch was new to me, and early on it felt slower than modeling parts directly. Once the relationships were set, changes that would have taken an afternoon updated in seconds. Learning where to put the controlling dimensions, and where not to, was most of the lesson.",
      },
      {
        title: "Packaging several mechanisms into a compact robot",
        body: "Intake, indexer, elevator, arm, gripper, and climber all had to fit in one frame and still move without collisions. Keeping the layout parametric let me shift one subsystem and immediately see how it affected the others, instead of finding the conflict after parts were modeled.",
      },
      {
        title: "Routing power through a rotating arm",
        body: "The scoring arm rotated, but the gripper at its end still needed drive. Running a belt transmission through the arm kept the motor mass near the frame and let the arm stay light. Getting the belt path and tension to work inside a thin carbon structure took the most iteration.",
      },
    ],
    highlights: [
      "Onshape",
      "Parametric CAD",
      "Master Sketch Design",
      "Robot Packaging",
      "Carbon Fiber Structures",
      "Belt Power Transmission",
    ],
    outcome: [
      "This project did what it was meant to do. It made my CAD workflow faster and taught me how experienced teams organize a large robot assembly with parametric design instead of a pile of independent parts.",
      "More than any single mechanism, the habit of designing from a master sketch is the thing I carried into later projects.",
    ],
    techStack: [
      { label: "Software",     value: "Onshape" },
      { label: "Discipline",   value: "Mechanical Design, Robotics" },
      { label: "Methods",      value: "Parametric Modeling, Master Sketch" },
      { label: "Materials",    value: "6061 Aluminum, Polycarbonate, Carbon Fiber" },
    ],
  },

  {
    slug: "low-profile-monitor-stand",
    index: 3,
    title: "Low Rise Monitor Stand",
    discipline: "Mechanical",
    year: "Personal",
    date: "Personal Project",
    tags: ["SolidWorks", "Sheet Metal", "Product Design"],
    lede: "A low rise monitor stand designed in SolidWorks to clean up my desk and learn sheet metal.",
    preview: "/assets/projects/monitor-stand-wireframe.png",
    hero: "/assets/projects/monitor-stand-render.png",
    summary:
      "A low rise monitor stand I designed to replace the bulky commercial stands I could never find a good version of. It cleared up my desk and improved my setup, and it gave me a reason to learn more advanced sheet metal and surfacing tools in SolidWorks while solving a real problem.",
    facts: [
      { label: "Role",          value: "Designer" },
      { label: "Collaboration", value: "Solo Project" },
      { label: "Software",      value: "SolidWorks" },
    ],
    overview: [
      "I started this because I wanted a clean, minimal stand and nothing on the market matched what I had in mind.",
      "It turned into a way to push my SolidWorks skills further. The brief was simple, but getting a good looking shape to behave as manufacturable sheet metal was not.",
    ],
    goals: [
      "Reduce desk clutter",
      "Create a minimal appearance",
      "Improve cable management",
      "Maintain stability",
      "Cut unnecessary weight",
    ],
    process: [
      {
        heading: "Planning",
        body: [
          "I began with the side profile, sketching the monitor at the height and viewing angle I actually wanted to sit at.",
          "That single sketch set the height, the footprint, and the clearance underneath, and the rest of the design grew from it.",
        ],
      },
      {
        heading: "Mechanical Design",
        body: [
          "The main body started as a loft so the form could stay smooth and intentional rather than boxy. Once the shape was right, I converted it into sheet metal so it could actually be made and stay light.",
          "The mounting features had to line up with a standard monitor while keeping the front edge low. Weight reduction pockets removed material where it was not doing structural work, and small reinforcements went back in where the part needed to stay stiff.",
          "I left clearance underneath for cables to pass through, which is part of why the stand sits low in the first place.",
        ],
      },
      {
        heading: "Stability",
        body: [
          "Because the stand is low and light, tipping was the real risk, especially forward where the monitor weight wants to go.",
          "I used center of gravity analysis to check where the combined mass sat, then adjusted the base geometry until the stand stayed planted without adding bulk just for ballast.",
        ],
      },
    ],
    challenges: [
      {
        title: "Learning 3D sketches",
        body: "The profile and the transitions needed 3D sketches, which I had mostly avoided before. Forcing myself to use them here is what made the smooth shape possible instead of a flat, folded box.",
      },
      {
        title: "Turning complex geometry into sheet metal",
        body: "A lofted shape and clean sheet metal do not always agree. Getting the surfaces to convert into a part with real bends and a flat pattern, without losing the look I wanted, took several attempts and taught me a lot about how the sheet metal tools actually think.",
      },
      {
        title: "Balancing rigidity with weight",
        body: "Every pocket I added to drop weight also removed stiffness. The back and forth between lightening the part and keeping it from flexing is where most of the design time went.",
      },
      {
        title: "Keeping the monitor from tipping forward",
        body: "A low stand has a short lever arm to fight a forward tip. The center of gravity work told me where to put the base material so the stand stayed stable without looking heavy.",
      },
    ],
    highlights: [
      "SolidWorks",
      "Sheet Metal",
      "3D Sketches",
      "Loft Features",
      "Center of Gravity Analysis",
      "Lightweight Structural Design",
    ],
    outcome: [
      "The stand ended up on my desk doing exactly what I wanted, and the project pushed my CAD skills further than the simple brief suggested.",
      "It is a good example of a small practical problem turning into real practice with surfacing, sheet metal, and stability analysis.",
    ],
    techStack: [
      { label: "Software",   value: "SolidWorks" },
      { label: "Discipline", value: "Mechanical Design" },
      { label: "Methods",    value: "3D Sketching, Loft, Sheet Metal" },
      { label: "Analysis",   value: "Center of Gravity" },
      { label: "Process",    value: "Sheet Metal Fabrication" },
    ],
  },

  {
    slug: "rival-robotics-2024",
    index: 1,
    title: "Rival Robotics 2024 Competition Robot",
    discipline: "Robotics",
    year: "2024",
    date: "2024 Competition",
    tags: ["VEX", "SolidWorks", "C++", "Limelight", "Vision"],
    lede: "A 2024 VEX competition robot with Limelight vision that aligns its own shots to ease the driver's load.",
    preview: "/assets/projects/rival-robotics-2024-wireframe.png",
    hero: "/assets/projects/rival-robotics-2024.png",
    summary:
      "A competition robot for the 2024 Rival Robotics Competition with custom vision-assisted scoring. It paired Limelight cameras with VEX hardware, a combination the two are not usually built for, so the robot could line up its shots on its own and take some of the load off the driver.",
    facts: [
      { label: "Role",          value: "Mechanical Design / Software" },
      { label: "Collaboration", value: "Team Project" },
      { label: "Software",      value: "SolidWorks, C++" },
    ],
    overview: [
      "This was a team project for a soccer-style robotics competition. We put a lot of weight on planning the robot from a master sketch and packaging the subsystems before any detailed CAD.",
      "The part I was most interested in was the vision system. Using Limelight cameras on a VEX robot is not a normal combination, and getting them to work together was the main experiment of the project.",
    ],
    goals: [
      "Build around the game objectives",
      "Use master sketches to organize the robot",
      "Improve scoring consistency",
      "Experiment with vision systems",
    ],
    process: [
      {
        heading: "Planning",
        body: [
          "The layout came from a master sketch that fixed where each subsystem would live before any detailed modeling started.",
          "That let each of us develop a subsystem on our own while trusting that the overall packaging and geometry still lined up.",
        ],
      },
      {
        heading: "Mechanical Design",
        body: [
          "The robot ran a six-wheel drivetrain with a mixed traction wheel setup, chosen so it could push when it needed grip and still turn without fighting itself.",
          "A kicker handled scoring and a roller managed game pieces feeding into it. None of these were exotic on their own. The work was packaging them together with the cameras so nothing blocked a sensor or a path the ball needed.",
        ],
      },
      {
        heading: "Vision System",
        body: [
          "This was the centerpiece. We ran two Limelight cameras on a platform that normally does not use them at all.",
          "One camera tracked game pieces and the other read AprilTags, so the robot could find a target and then square itself up to the field before scoring. The driver could focus on getting close while the robot handled the fine alignment.",
          "The real engineering was in the integration. Getting Limelight data into VEX hardware, then turning that into reliable alignment in C++, meant the software and the mechanical design had to be planned together rather than bolted on at the end.",
        ],
      },
    ],
    extraSections: [
      {
        label: "Competition",
        body: [
          "We took the robot to the Orange County Maker Faire and competed against teams stronger than us on hardware.",
          "I am less interested in where we placed than in what the event taught us. Running the robot against better competitors showed where our design held up and where it did not, and it made a strong case for experimentation, preparation, and iterating instead of trusting a design on paper.",
        ],
      },
    ],
    challenges: [
      {
        title: "Integrating Limelight with VEX",
        body: "The two systems are not designed to talk to each other. Most of the early work was just getting reliable camera data into the VEX control system in a form the robot code could act on.",
      },
      {
        title: "Packaging multiple cameras",
        body: "Two cameras both need clear, stable sightlines. Fitting them onto the robot without blocking their view, or putting them where a mechanism would knock them out of alignment, shaped a lot of the layout.",
      },
      {
        title: "Designing reliable vision-assisted alignment",
        body: "Tracking a tag once is easy. Doing it consistently enough that a driver can trust it during a match is not. Tuning the alignment so it behaved the same way every time was the difference between a demo and a useful feature.",
      },
      {
        title: "Coordinating software with mechanical systems",
        body: "The alignment only worked because the cameras, the drivetrain, and the code were planned around each other. This project is where I really felt how mechanical and software decisions depend on each other.",
      },
    ],
    highlights: [
      "SolidWorks",
      "C++",
      "Limelight",
      "AprilTags",
      "Master Sketch Workflow",
      "Robot Packaging",
    ],
    outcome: [
      "This robot pushed both my mechanical and software skills, and it showed me how vision and thoughtful mechanical design can work together to make a hard task simpler for the driver.",
      "Even with less powerful hardware than the teams around us, the alignment system proved the idea was worth chasing.",
    ],
    techStack: [
      { label: "Software",    value: "SolidWorks" },
      { label: "Programming", value: "C++" },
      { label: "Vision",      value: "Limelight, AprilTags" },
      { label: "Platform",    value: "VEX" },
      { label: "Methods",     value: "Master Sketch, Robot Packaging" },
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
