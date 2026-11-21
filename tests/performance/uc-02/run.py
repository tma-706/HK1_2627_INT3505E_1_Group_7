from pathlib import Path
import sys

suite = Path(__file__).resolve().parent
sys.path.insert(0, str(suite.parent))
from profile_runner import main

if __name__ == "__main__":
    sys.exit(main(suite))
