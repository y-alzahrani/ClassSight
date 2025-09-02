#!/usr/bin/env python3
"""
Dependency Check Script for ClassSight Backend
Tests that all required packages are installed and working
"""

import sys
import importlib
from typing import List, Tuple

def check_dependency(package_name: str, import_name: str = None) -> Tuple[bool, str]:
    """Check if a dependency is available and working"""
    if import_name is None:
        import_name = package_name
    
    try:
        module = importlib.import_module(import_name)
        version = getattr(module, '__version__', 'unknown')
        return True, version
    except ImportError as e:
        return False, str(e)

def main():
    """Run dependency checks"""
    print("🔍 ClassSight Backend Dependency Check")
    print("=" * 50)
    
    # Core dependencies
    core_deps = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("pydantic", "pydantic"),
        ("supabase", "supabase"),
        ("python-dotenv", "dotenv"),
        ("httpx", "httpx"),
    ]
    
    # ML/AI dependencies
    ml_deps = [
        ("ultralytics", "ultralytics"),
        ("opencv-python", "cv2"),
        ("torch", "torch"),
        ("numpy", "numpy"),
        ("pandas", "pandas"),
        ("Pillow", "PIL"),
    ]
    
    # RAG dependencies
    rag_deps = [
        ("langchain", "langchain"),
        ("langchain-openai", "langchain_openai"),
        ("langchain-community", "langchain_community"),
        ("openai", "openai"),
        ("faiss-cpu", "faiss"),
    ]
    
    # Database dependencies
    db_deps = [
        ("psycopg2-binary", "psycopg2"),
        ("asyncpg", "asyncpg"),
    ]
    
    # Report dependencies
    report_deps = [
        ("reportlab", "reportlab"),
    ]
    
    # Testing dependencies
    test_deps = [
        ("aiohttp", "aiohttp"),
    ]
    
    # Optional dependencies
    optional_deps = [
        ("matplotlib", "matplotlib"),
        ("tensorboard", "tensorboard"),
    ]
    
    all_sections = [
        ("Core FastAPI", core_deps),
        ("Machine Learning", ml_deps),
        ("RAG System", rag_deps),
        ("Database", db_deps),
        ("Reports", report_deps),
        ("Testing", test_deps),
        ("Optional", optional_deps),
    ]
    
    total_checked = 0
    total_working = 0
    failed_deps = []
    
    for section_name, deps in all_sections:
        print(f"\n📦 {section_name} Dependencies:")
        section_working = 0
        
        for package_name, import_name in deps:
            working, version = check_dependency(package_name, import_name)
            total_checked += 1
            
            if working:
                print(f"  ✅ {package_name:20} - v{version}")
                total_working += 1
                section_working += 1
            else:
                print(f"  ❌ {package_name:20} - {version}")
                failed_deps.append((package_name, version))
        
        print(f"     {section_working}/{len(deps)} working")
    
    # Test YOLO model loading
    print(f"\n🤖 YOLO Model Test:")
    try:
        from models.yolo_service import YOLOAttentionDetector
        detector = YOLOAttentionDetector()
        print("  ✅ YOLOAttentionDetector imports successfully")
        
        # Test model file exists
        import os
        if os.path.exists("models/trained_models/best.pt"):
            print("  ✅ Trained model file exists")
        else:
            print("  ⚠️  Trained model file not found")
    except Exception as e:
        print(f"  ❌ YOLO service error: {e}")
    
    # Summary
    print(f"\n" + "=" * 50)
    print(f"📊 Summary: {total_working}/{total_checked} dependencies working")
    
    if failed_deps:
        print(f"\n❌ Failed Dependencies:")
        for package, error in failed_deps:
            print(f"  - {package}: {error}")
        print(f"\n💡 To fix missing dependencies, run:")
        print(f"   pip install -r requirements.txt")
        return 1
    else:
        print(f"🎉 All dependencies are working correctly!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
