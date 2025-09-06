/**
 * PDBParser - A utility for parsing and extracting data from PDB files
 * 
 * This parser extracts key information from Protein Data Bank (PDB) files including:
 * - Basic header information (title, authors, date)
 * - Atom coordinates and properties
 * - Secondary structure assignments
 * - Sequence information
 * - Glycosylation sites (for glycoproteins)
 */

class PDBParser {
  constructor() {
    this.reset();
  }

  reset() {
    this.atoms = [];
    this.aminoAcids = {};
    this.secondaryStructure = {};
    this.header = {
      title: '',
      idCode: '',
      classification: '',
      depDate: '',
      authors: [],
      keywords: [],
      journal: '',
      resolution: null,
      rFactor: null
    };
    this.sequenceInfo = {
      sequences: [],
      chainSequences: {}
    };
    this.glycosylationSites = [];
    this.disulfideBridges = [];
    this.statistics = {
      atomCount: 0,
      residueCount: 0,
      chainCount: 0,
      helixCount: 0,
      sheetCount: 0,
      glycosylationCount: 0
    };
  }

  /**
   * Parse a PDB file text content
   * @param {string} pdbContent - The text content of a PDB file
   * @returns {Object} Parsed PDB data
   */
  parse(pdbContent) {
    this.reset();
    
    if (!pdbContent) {
      throw new Error('No PDB content provided');
    }

    const lines = pdbContent.split('\n');
    const chains = new Set();
    const residues = new Set();

    // First pass: Parse header information and count items
    lines.forEach(line => {
      const recordName = line.substring(0, 6).trim();

      switch (recordName) {
        case 'HEADER':
          this.parseHeader(line);
          break;
        case 'TITLE':
          this.parseTitle(line);
          break;
        case 'AUTHOR':
          this.parseAuthor(line);
          break;
        case 'KEYWDS':
          this.parseKeywords(line);
          break;
        case 'JRNL':
          this.parseJournal(line);
          break;
        case 'REMARK':
          this.parseRemark(line);
          break;
        case 'HELIX':
          this.parseHelix(line);
          this.statistics.helixCount++;
          break;
        case 'SHEET':
          this.parseSheet(line);
          this.statistics.sheetCount++;
          break;
        case 'ATOM':
        case 'HETATM':
          const atom = this.parseAtom(line);
          this.atoms.push(atom);
          this.statistics.atomCount++;
          
          // Track unique chains and residues
          chains.add(atom.chainId);
          residues.add(`${atom.chainId}_${atom.resSeq}`);
          break;
        case 'SSBOND':
          this.parseDisulfideBridge(line);
          break;
        case 'SEQRES':
          this.parseSequenceInfo(line);
          break;
      }
    });

    this.statistics.chainCount = chains.size;
    this.statistics.residueCount = residues.size;

    // Second pass: Identify glycosylation sites
    this.identifyGlycosylationSites();
    this.statistics.glycosylationCount = this.glycosylationSites.length;

    return {
      header: this.header,
      atoms: this.atoms,
      secondaryStructure: this.secondaryStructure,
      sequenceInfo: this.sequenceInfo,
      glycosylationSites: this.glycosylationSites,
      disulfideBridges: this.disulfideBridges,
      statistics: this.statistics
    };
  }

  /**
   * Parse the HEADER record
   * @param {string} line - HEADER record line
   */
  parseHeader(line) {
    if (line.length < 50) return;
    
    this.header.classification = line.substring(10, 50).trim();
    this.header.depDate = line.substring(50, 59).trim();
    this.header.idCode = line.substring(62, 66).trim();
  }

  /**
   * Parse the TITLE record
   * @param {string} line - TITLE record line
   */
  parseTitle(line) {
    const continuation = parseInt(line.substring(8, 10).trim() || '1');
    const titlePart = line.substring(10).trim();
    
    if (continuation === 1) {
      this.header.title = titlePart;
    } else {
      this.header.title += ' ' + titlePart;
    }
  }

  /**
   * Parse the AUTHOR record
   * @param {string} line - AUTHOR record line
   */
  parseAuthor(line) {
    const authorPart = line.substring(10).trim();
    const authors = authorPart.split(',').map(author => author.trim());
    this.header.authors = [...this.header.authors, ...authors];
  }

  /**
   * Parse the KEYWORDS record
   * @param {string} line - KEYWORDS record line
   */
  parseKeywords(line) {
    const keywordsPart = line.substring(10).trim();
    const keywords = keywordsPart.split(',').map(keyword => keyword.trim());
    this.header.keywords = [...this.header.keywords, ...keywords];
  }

  /**
   * Parse the JRNL record
   * @param {string} line - JRNL record line
   */
  parseJournal(line) {
    if (line.substring(12, 16).trim() === 'REF') {
      const ref = line.substring(19).trim();
      this.header.journal += ref + ' ';
    }
  }

  /**
   * Parse the REMARK record
   * @param {string} line - REMARK record line
   */
  parseRemark(line) {
    const remarkNum = parseInt(line.substring(7, 10).trim());
    
    // Extract resolution information from REMARK 2
    if (remarkNum === 2 && line.includes('RESOLUTION')) {
      const resolutionMatch = line.match(/RESOLUTION\.\s+(\d+\.\d+)\s+ANGSTROMS/);
      if (resolutionMatch && resolutionMatch[1]) {
        this.header.resolution = parseFloat(resolutionMatch[1]);
      }
    }
    
    // Extract R-factor from REMARK 3
    if (remarkNum === 3 && line.includes('R VALUE')) {
      const rFactorMatch = line.match(/R VALUE\s+\S+\s+:\s+(\d+\.\d+)/);
      if (rFactorMatch && rFactorMatch[1]) {
        this.header.rFactor = parseFloat(rFactorMatch[1]);
      }
    }
  }

  /**
   * Parse the ATOM record
   * @param {string} line - ATOM or HETATM record line
   * @returns {Object} Atom data
   */
  parseAtom(line) {
    if (line.length < 54) return null;
    
    const recordType = line.substring(0, 6).trim();
    const isHetAtm = recordType === 'HETATM';
    
    const atom = {
      recordType: recordType,
      serial: parseInt(line.substring(6, 11).trim()),
      name: line.substring(12, 16).trim(),
      altLoc: line.substring(16, 17).trim(),
      resName: line.substring(17, 20).trim(),
      chainId: line.substring(21, 22).trim(),
      resSeq: parseInt(line.substring(22, 26).trim()),
      iCode: line.substring(26, 27).trim(),
      x: parseFloat(line.substring(30, 38).trim()),
      y: parseFloat(line.substring(38, 46).trim()),
      z: parseFloat(line.substring(46, 54).trim()),
      isHetAtm: isHetAtm
    };
    
    // Optional fields
    if (line.length >= 60) {
      atom.occupancy = parseFloat(line.substring(54, 60).trim());
    }
    
    if (line.length >= 66) {
      atom.tempFactor = parseFloat(line.substring(60, 66).trim());
    }
    
    if (line.length >= 78) {
      atom.element = line.substring(76, 78).trim();
    }
    
    if (line.length >= 80) {
      atom.charge = line.substring(78, 80).trim();
    }
    
    // Store amino acid information
    const residueKey = `${atom.chainId}_${atom.resSeq}`;
    if (!this.aminoAcids[residueKey]) {
      this.aminoAcids[residueKey] = {
        name: atom.resName,
        chainId: atom.chainId,
        resSeq: atom.resSeq,
        atoms: []
      };
    }
    
    this.aminoAcids[residueKey].atoms.push(atom);
    
    return atom;
  }

  /**
   * Parse the HELIX record
   * @param {string} line - HELIX record line
   */
  parseHelix(line) {
    if (line.length < 40) return;
    
    const helixId = line.substring(11, 14).trim();
    const initChainId = line.substring(19, 20).trim();
    const initResSeq = parseInt(line.substring(21, 25).trim());
    const endChainId = line.substring(31, 32).trim();
    const endResSeq = parseInt(line.substring(33, 37).trim());
    const helixClass = parseInt(line.substring(38, 40).trim());
    
    if (!this.secondaryStructure.helices) {
      this.secondaryStructure.helices = [];
    }
    
    this.secondaryStructure.helices.push({
      id: helixId,
      initChainId,
      initResSeq,
      endChainId,
      endResSeq,
      helixClass
    });
    
    // Mark residues as being part of a helix
    for (let resSeq = initResSeq; resSeq <= endResSeq; resSeq++) {
      const residueKey = `${initChainId}_${resSeq}`;
      if (this.aminoAcids[residueKey]) {
        this.aminoAcids[residueKey].secondaryStructure = 'helix';
        this.aminoAcids[residueKey].helixId = helixId;
      }
    }
  }

  /**
   * Parse the SHEET record
   * @param {string} line - SHEET record line
   */
  parseSheet(line) {
    if (line.length < 40) return;
    
    const sheetId = line.substring(11, 14).trim();
    const strandNum = parseInt(line.substring(7, 10).trim());
    const initChainId = line.substring(21, 22).trim();
    const initResSeq = parseInt(line.substring(22, 26).trim());
    const endChainId = line.substring(32, 33).trim();
    const endResSeq = parseInt(line.substring(33, 37).trim());
    
    if (!this.secondaryStructure.sheets) {
      this.secondaryStructure.sheets = {};
    }
    
    if (!this.secondaryStructure.sheets[sheetId]) {
      this.secondaryStructure.sheets[sheetId] = [];
    }
    
    this.secondaryStructure.sheets[sheetId].push({
      strandNum,
      initChainId,
      initResSeq,
      endChainId,
      endResSeq
    });
    
    // Mark residues as being part of a sheet
    for (let resSeq = initResSeq; resSeq <= endResSeq; resSeq++) {
      const residueKey = `${initChainId}_${resSeq}`;
      if (this.aminoAcids[residueKey]) {
        this.aminoAcids[residueKey].secondaryStructure = 'sheet';
        this.aminoAcids[residueKey].sheetId = sheetId;
      }
    }
  }

  /**
   * Parse the SEQRES record
   * @param {string} line - SEQRES record line
   */
  parseSequenceInfo(line) {
    if (line.length < 20) return;
    
    const serNum = parseInt(line.substring(7, 10).trim());
    const chainId = line.substring(11, 12).trim();
    const numRes = parseInt(line.substring(13, 17).trim());
    const residues = line.substring(19).trim().split(/\s+/);
    
    if (!this.sequenceInfo.chainSequences[chainId]) {
      this.sequenceInfo.chainSequences[chainId] = {
        numRes,
        residues: []
      };
    }
    
    this.sequenceInfo.chainSequences[chainId].residues.push(...residues);
  }

  /**
   * Parse the SSBOND (disulfide bridge) record
   * @param {string} line - SSBOND record line
   */
  parseDisulfideBridge(line) {
    if (line.length < 40) return;
    
    const serialNum = parseInt(line.substring(7, 10).trim());
    const chain1 = line.substring(15, 16).trim();
    const resSeq1 = parseInt(line.substring(17, 21).trim());
    const chain2 = line.substring(29, 30).trim();
    const resSeq2 = parseInt(line.substring(31, 35).trim());
    
    this.disulfideBridges.push({
      serialNum,
      chain1,
      resSeq1,
      chain2,
      resSeq2
    });
  }

  /**
   * Identify glycosylation sites in the protein structure
   * This focuses on N-linked and O-linked glycosylation
   */
  identifyGlycosylationSites() {
    // Clear existing sites
    this.glycosylationSites = [];
    
    // Check all residue pairs for N-linked glycosylation (Asn-X-Ser/Thr)
    for (const chainId in this.sequenceInfo.chainSequences) {
      const residues = this.sequenceInfo.chainSequences[chainId].residues;
      
      for (let i = 0; i < residues.length - 2; i++) {
        // Check for Asn-X-Ser/Thr motif (N-linked glycosylation)
        if (
          residues[i] === 'ASN' && 
          (residues[i + 2] === 'SER' || residues[i + 2] === 'THR')
        ) {
          // Find the actual residue sequence number from atom data
          const asnResidue = Object.values(this.aminoAcids).find(
            aa => aa.chainId === chainId && aa.name === 'ASN' && 
            this.getRelativePosition(aa.resSeq, chainId) === i + 1
          );
          
          if (asnResidue) {
            this.glycosylationSites.push({
              type: 'N-linked',
              chainId,
              resSeq: asnResidue.resSeq,
              resName: 'ASN',
              motif: `${residues[i]}-${residues[i+1]}-${residues[i+2]}`,
              position: i + 1
            });
          }
        }
      }
    }
    
    // Check for actual carbohydrate attachments
    // Look for NAG (N-acetylglucosamine) attached to ASN
    const sugarResidues = ['NAG', 'MAN', 'GAL', 'SIA', 'FUC'];
    
    for (const residueKey in this.aminoAcids) {
      const residue = this.aminoAcids[residueKey];
      
      // Check if this is a sugar residue
      if (sugarResidues.includes(residue.name)) {
        // Find the nearest amino acid to this sugar
        const nearestAA = this.findNearestResidue(residue);
        
        if (nearestAA) {
          // If the nearest amino acid is ASN, it's likely N-linked
          if (nearestAA.name === 'ASN') {
            const existingSite = this.glycosylationSites.find(
              site => site.chainId === nearestAA.chainId && site.resSeq === nearestAA.resSeq
            );
            
            if (!existingSite) {
              this.glycosylationSites.push({
                type: 'N-linked',
                chainId: nearestAA.chainId,
                resSeq: nearestAA.resSeq,
                resName: 'ASN',
                sugarType: residue.name,
                motif: 'Direct attachment',
                position: this.getRelativePosition(nearestAA.resSeq, nearestAA.chainId)
              });
            }
          }
          // If the nearest amino acid is SER or THR, it's likely O-linked
          else if (nearestAA.name === 'SER' || nearestAA.name === 'THR') {
            this.glycosylationSites.push({
              type: 'O-linked',
              chainId: nearestAA.chainId,
              resSeq: nearestAA.resSeq,
              resName: nearestAA.name,
              sugarType: residue.name,
              motif: 'Direct attachment',
              position: this.getRelativePosition(nearestAA.resSeq, nearestAA.chainId)
            });
          }
        }
      }
    }
  }

  /**
   * Find the nearest amino acid residue to a given residue
   * @param {Object} residue - The residue to find neighbors for
   * @returns {Object} The nearest amino acid residue
   */
  findNearestResidue(residue) {
    let nearestResidue = null;
    let minDistance = Infinity;
    
    // Calculate the center of the residue
    const center = this.calculateResidueCenter(residue);
    
    // Check distance to all non-sugar amino acids
    for (const residueKey in this.aminoAcids) {
      const otherResidue = this.aminoAcids[residueKey];
      
      // Skip if this is a sugar or the same residue
      if (
        residue === otherResidue || 
        ['NAG', 'MAN', 'GAL', 'SIA', 'FUC'].includes(otherResidue.name)
      ) {
        continue;
      }
      
      const otherCenter = this.calculateResidueCenter(otherResidue);
      const distance = this.calculateDistance(center, otherCenter);
      
      if (distance < minDistance && distance < 5.0) { // 5 Å cutoff for bond detection
        minDistance = distance;
        nearestResidue = otherResidue;
      }
    }
    
    return nearestResidue;
  }

  /**
   * Calculate the center coordinates of a residue
   * @param {Object} residue - The residue to calculate center for
   * @returns {Object} The center coordinates {x, y, z}
   */
  calculateResidueCenter(residue) {
    let sumX = 0, sumY = 0, sumZ = 0;
    const atoms = residue.atoms;
    
    for (const atom of atoms) {
      sumX += atom.x;
      sumY += atom.y;
      sumZ += atom.z;
    }
    
    return {
      x: sumX / atoms.length,
      y: sumY / atoms.length,
      z: sumZ / atoms.length
    };
  }

  /**
   * Calculate the Euclidean distance between two points
   * @param {Object} point1 - The first point {x, y, z}
   * @param {Object} point2 - The second point {x, y, z}
   * @returns {number} The distance between the points
   */
  calculateDistance(point1, point2) {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) +
      Math.pow(point2.y - point1.y, 2) +
      Math.pow(point2.z - point1.z, 2)
    );
  }

  /**
   * Get the relative position (index) of a residue in its chain
   * @param {number} resSeq - The residue sequence number
   * @param {string} chainId - The chain identifier
   * @returns {number} The relative position in the chain (1-based)
   */
  getRelativePosition(resSeq, chainId) {
    if (!this.sequenceInfo.chainSequences[chainId]) {
      return -1;
    }
    
    // Find all residues for this chain from atoms
    const residues = Object.values(this.aminoAcids)
      .filter(aa => aa.chainId === chainId)
      .sort((a, b) => a.resSeq - b.resSeq);
    
    for (let i = 0; i < residues.length; i++) {
      if (residues[i].resSeq === resSeq) {
        return i + 1;
      }
    }
    
    return -1;
  }

  /**
   * Generate a protein summary report
   * @returns {Object} A summary of the protein structure
   */
  generateSummary() {
    return {
      title: this.header.title,
      pdbId: this.header.idCode,
      depositionDate: this.header.depDate,
      resolution: this.header.resolution,
      classification: this.header.classification,
      statistics: this.statistics,
      sequence: {
        chains: Object.keys(this.sequenceInfo.chainSequences).length,
        totalResidues: this.statistics.residueCount,
        chainDetails: Object.keys(this.sequenceInfo.chainSequences).map(chainId => ({
          chainId,
          length: this.sequenceInfo.chainSequences[chainId].residues.length
        }))
      },
      structure: {
        helices: this.secondaryStructure.helices ? this.secondaryStructure.helices.length : 0,
        sheets: this.secondaryStructure.sheets ? 
          Object.keys(this.secondaryStructure.sheets).length : 0,
        disulfideBridges: this.disulfideBridges.length
      },
      glycosylation: {
        sites: this.glycosylationSites.length,
        nLinked: this.glycosylationSites.filter(site => site.type === 'N-linked').length,
        oLinked: this.glycosylationSites.filter(site => site.type === 'O-linked').length,
        details: this.glycosylationSites
      }
    };
  }
}

/**
 * Component for uploading and analyzing PDB files
 * This can be integrated into a React component to handle file uploads
 */
export function handlePDBUpload(file, callback) {
  if (!file) {
    callback({ 
      error: 'No file selected' 
    });
    return;
  }

  const reader = new FileReader();
  
  reader.onload = (event) => {
    try {
      const parser = new PDBParser();
      const pdbData = parser.parse(event.target.result);
      const summary = parser.generateSummary();
      
      callback({
        success: true,
        pdbData,
        summary,
        fileName: file.name
      });
    } catch (error) {
      callback({
        error: `Error parsing PDB file: ${error.message}`
      });
    }
  };
  
  reader.onerror = () => {
    callback({
      error: 'Error reading file'
    });
  };
  
  reader.readAsText(file);
}

/**
 * Generate a visual report of glycoprotein features
 * @param {Object} pdbSummary - The summary generated by PDBParser
 * @returns {Object} Visualization data for the protein
 */
export function generateProteinReport(pdbSummary) {
  if (!pdbSummary) return null;
  
  return {
    metadata: {
      title: pdbSummary.title,
      pdbId: pdbSummary.pdbId,
      resolution: pdbSummary.resolution ? `${pdbSummary.resolution.toFixed(2)} Å` : 'N/A',
      classification: pdbSummary.classification,
      chains: pdbSummary.sequence.chains,
      residues: pdbSummary.statistics.residueCount,
      atoms: pdbSummary.statistics.atomCount
    },
    structureStats: {
      helixPercentage: pdbSummary.statistics.helixCount 
        ? ((pdbSummary.structure.helices / pdbSummary.statistics.residueCount) * 100).toFixed(1) 
        : 0,
      sheetPercentage: pdbSummary.structure.sheets 
        ? ((pdbSummary.structure.sheets * 4 / pdbSummary.statistics.residueCount) * 100).toFixed(1) 
        : 0, // Assuming average sheet strand length of 4
      disulfideBridges: pdbSummary.structure.disulfideBridges
    },
    glycosylation: {
      totalSites: pdbSummary.glycosylation.sites,
      nLinked: pdbSummary.glycosylation.nLinked,
      oLinked: pdbSummary.glycosylation.oLinked,
      siteDetails: pdbSummary.glycosylation.details.map(site => ({
        type: site.type,
        chain: site.chainId,
        position: site.position,
        residueNumber: site.resSeq,
        residue: site.resName,
        sugarType: site.sugarType || 'N/A'
      }))
    },
    visualizationHighlights: {
      // Coordinates for highlighting in the 3D viewer
      glycosylationSites: pdbSummary.glycosylation.details.map(site => ({
        chainId: site.chainId,
        resSeq: site.resSeq,
        type: site.type,
        color: site.type === 'N-linked' ? '#00FF00' : '#FF9900' // Green for N-linked, Orange for O-linked
      })),
      disulfideBridges: pdbSummary.structure.disulfideBridges > 0 
        ? { color: '#FFFF00' } // Yellow for disulfide bridges
        : null
    }
  };
}

// Export both the parser and utility functions
export { PDBParser };
