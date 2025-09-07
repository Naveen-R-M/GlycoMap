import subprocess
from typing import Sequence

def run(cmd: Sequence[str] | str, shell: bool = False, check: bool = True) -> str:
    if shell:
        out = subprocess.check_output(cmd, shell=True)
    else:
        out = subprocess.check_output(cmd)
    return out.decode().strip()