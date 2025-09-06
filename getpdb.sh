#!/bin/bash

# change model numbers, main folder name, residue renumber

for m in {1..10}
do
        for i in {0..99}
        do
                filename=/Users/srirupac/Desktop/work/HIVproj/SIVMac239/model${m}/pred_dECALCrAS1000/siv.pdb_${i}/pm.pdb.B99990001.pdb
                echo $filename
                ~/Desktop/software/vmd -dispdev text -e premKM.tcl -args $filename
                ~/Desktop/software/pdb_tools-master/pdb_residue-renumber.py CHC.pdb -s 1
                ~/Desktop/software/pdb_tools-master/pdb_residue-renumber.py CHE.pdb -s 1
                ~/Desktop/software/pdb_tools-master/pdb_residue-renumber.py CAR1.pdb -s 1
                ~/Desktop/software/pdb_tools-master/pdb_residue-renumber.py CAR2.pdb -s 1
                ~/Desktop/software/pdb_tools-master/pdb_residue-renumber.py CAR3.pdb -s 1
                ~/Desktop/software/pdb_tools-master/pdb_residue-renumber.py CHD.pdb -s 494
                ~/Desktop/software/pdb_tools-master/pdb_residue-renumber.py CHF.pdb -s 494

                awk '!/END/' CHA.pdb > Ctemp.pdb
                cat Ctemp.pdb >> Ctemp2.pdb
                awk '!/END/' CHB.pdb > Ctemp.pdb
                cat Ctemp.pdb >> Ctemp2.pdb
                awk '!/END/' CHC_res-renum.pdb > Ctemp.pdb
                cat Ctemp.pdb >> Ctemp2.pdb
                awk '!/END/' CHD_res-renum.pdb > Ctemp.pdb
                cat Ctemp.pdb >> Ctemp2.pdb
                awk '!/END/' CHE_res-renum.pdb > Ctemp.pdb
                cat Ctemp.pdb >> Ctemp2.pdb
                awk '!/END/' CHF_res-renum.pdb > Ctemp.pdb
                cat Ctemp.pdb >> Ctemp2.pdb
                awk '!/END/' CAR1_res-renum.pdb > Ctemp.pdb
                cat Ctemp.pdb >> Ctemp2.pdb
                awk '!/END/' CAR2_res-renum.pdb > Ctemp.pdb
                cat Ctemp.pdb >> Ctemp2.pdb
                cat CAR3_res-renum.pdb >> Ctemp2.pdb
                awk '!/CRYST1/' Ctemp2.pdb > Ctemp.pdb

                ~/Desktop/software/pdb_tools-master/pdb_atom_renumber.py Ctemp.pdb > Ctemp2.pdb
                awk '!/REMARK/' Ctemp2.pdb > Ctemp.pdb
                cat Ctemp.pdb >> mac239_native.pdb
                rm Cte*.pdb
        done
done
rm C*.pdb
