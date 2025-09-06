#!/bin/bash

folder=$1
renumber_script="/path/to/pdb_residue_renumber.py"   # <-- update this path

# Read NRUNS from input.dat in the main folder
NRUNS=$(grep -oP '^NRUNS=\K\d+' "$folder/input.dat")

for m in "$folder"/*; do
    if [ -d "$m" ]; then
        # Read glycan parameters from python script once per folder $m
        read g1_start g1_end g2_start g2_end g3_start g3_end chain_len first_chain_len < <(python3 compute_glycan_params.py "$m/align.ali" "$m/glyc.dat")

        for i in $(seq 0 $((NRUNS - 1))); do
            filename="${folder}/pred_dECALCrAS1000/siv.pdb_${i}/pm.pdb.B99990001.pdb"
            echo "Processing $filename"

            # Run VMD with computed glycan parameters
            vmd -dispdev text -e premKM.tcl -args "$filename" "{$g1_start $g1_end}" "{$g2_start $g2_end}" "{$g3_start $g3_end}"

            # Renumber pdb files based on chain length
            if [ "$chain_len" -eq 3 ]; then
                python3 "$renumber_script" CHC.pdb && mv CHC_res-renum.pdb CHC_renum.pdb
                python3 "$renumber_script" CHB.pdb && mv CHB_res-renum.pdb CHB_renum.pdb
                python3 "$renumber_script" CAR1.pdb && mv CAR1_res-renum.pdb CAR1_renum.pdb
                python3 "$renumber_script" CAR2.pdb && mv CAR2_res-renum.pdb CAR2_renum.pdb
                python3 "$renumber_script" CAR3.pdb && mv CAR3_res-renum.pdb CAR3_renum.pdb
                concat_files="CHC_renum.pdb CHB_renum.pdb CAR1_renum.pdb CAR2_renum.pdb CAR3_renum.pdb"
            else
                python3 "$renumber_script" CHC.pdb && mv CHC_res-renum.pdb CHC_renum.pdb
                python3 "$renumber_script" CHE.pdb && mv CHE_res-renum.pdb CHE_renum.pdb
                python3 "$renumber_script" CAR1.pdb && mv CAR1_res-renum.pdb CAR1_renum.pdb
                python3 "$renumber_script" CAR2.pdb && mv CAR2_res-renum.pdb CAR2_renum.pdb
                python3 "$renumber_script" CAR3.pdb && mv CAR3_res-renum.pdb CAR3_renum.pdb
                python3 "$renumber_script" CHD.pdb && mv CHD_res-renum.pdb CHD_renum.pdb
                python3 "$renumber_script" CHF.pdb && mv CHF_res-renum.pdb CHF_renum.pdb
                concat_files="CHC_renum.pdb CHE_renum.pdb CAR1_renum.pdb CAR2_renum.pdb CAR3_renum.pdb CHD_renum.pdb CHF_renum.pdb"
            fi

            # Initialize temporary concatenation file
            > Ctemp2.pdb

            for file in $concat_files; do
                awk '!/END/' "$file" > Ctemp.pdb
                cat Ctemp.pdb >> Ctemp2.pdb
            done

            awk '!/CRYST1/' Ctemp2.pdb > Ctemp.pdb

            # Renumber atoms and remove REMARK lines
            ~/Desktop/software/pdb_tools-master/pdb_atom_renumber.py Ctemp.pdb > Ctemp2.pdb
            awk '!/REMARK/' Ctemp2.pdb > Ctemp.pdb

            # Append to the final output file
            cat Ctemp.pdb >> mac239_native.pdb

            # Clean temporary files for this iteration
            rm -f Ctemp.pdb Ctemp2.pdb
        done
    fi
done

# Final cleanup in case anything remains
rm -f Ctemp.pdb Ctemp2.pdb