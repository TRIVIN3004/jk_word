import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';

const OUTPUT_PATH = path.join(path.resolve(), 'sample-handbook.docx');

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          text: "JK ENTERPRISE SYSTEM DOCUMENT",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 1000, after: 200 }
        }),
        new Paragraph({
          text: "Mock Standard Manual for Platform Verification",
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 1000 }
        }),
        
        // Section 1
        new Paragraph({ text: "Welcome to JK Group", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: "This handbook acts as a corporate knowledge source. It details onboarding check-lists, employee policies, digital consultation workflows, and standards." }),
        new Paragraph({ text: "When uploaded to the documentation system, the parser splits this file using H1 tag headings." }),

        // Section 2
        new Paragraph({ text: "Onboarding and Setup Policies", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: "Newly hired staff must read the introduction modules, complete security training within 5 days, and configure SSH keys with two-factor locks." }),
        new Paragraph({ text: "Equipment like corporate laptops must remain encrypted with standard passwords." }),

        // Section 3
        new Paragraph({ text: "Cloud Deployment Guidelines", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: "Deployments happen via standard pipelines. Our team leverages Docker files and GitHub actions to deploy to staging on every push." }),
        new Paragraph({ text: "Database migrations must be audited and verified prior to production releases." }),
        
        // Section 4
        new Paragraph({ text: "Technical Standards Glossary", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: "We utilize TypeScript for type-safety across client and server nodes. Rest APIs must return standard success response envelopes with proper status codes." })
      ]
    }
  ]
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUTPUT_PATH, buffer);
  console.log("=============================================");
  console.log(" ✓ Created sample-handbook.docx successfully!");
  console.log(" Path: ./sample-handbook.docx");
  console.log("=============================================");
}).catch(err => {
  console.error("Failed to generate sample docx:", err);
});
