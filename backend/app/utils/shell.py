import subprocess
import shlex
from typing import Sequence, Union   # ← add this

Cmd = Union[Sequence[str], str]

def run(cmd: Cmd, shell: bool = False, check: bool = True) -> str:
    """
    Run a command and return stdout (decoded). Py3.8-friendly typing.
    - If shell=True: accepts str or Sequence; executes via the shell.
    - If shell=False: str is split with shlex; Sequence is passed as-is.
    """
    if shell:
        # Accept either a string or sequence; shell=True wants a string
        cmd_str = cmd if isinstance(cmd, str) else " ".join(cmd)
        out = subprocess.check_output(cmd_str, shell=True, stderr=subprocess.STDOUT)
    else:
        # Ensure we pass a list of args when not using the shell
        args = cmd if not isinstance(cmd, str) else shlex.split(cmd)
        out = subprocess.check_output(args, stderr=subprocess.STDOUT)
    return out.decode().strip()