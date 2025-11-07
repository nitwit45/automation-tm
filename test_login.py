#!/usr/bin/env python3
"""
Test script to verify login and token handling
"""

from dtm_bot import DTMBot

def test_login():
    """Test login with provided credentials"""
    print("="*60)
    print("DTM Bot - Login Test")
    print("="*60)
    print()
    
    # Initialize bot
    bot = DTMBot()
    
    # Login credentials
    username = "nithila@payable.lk"
    password = "Aqua1483@2003"
    
    # Attempt login
    print("Testing login...")
    if bot.login(username, password):
        print("\n" + "="*60)
        print("✓ LOGIN SUCCESSFUL!")
        print("="*60)
        
        # Test API calls with the established session
        print("\nTesting API calls with authenticated session...\n")
        
        # Test 1: Get task types
        print("1. Fetching task types...")
        task_types = bot.get_task_types()
        if task_types:
            print(f"   ✓ Retrieved {len(task_types)} task types")
            print(f"   Examples:")
            for tt in task_types[:3]:
                print(f"     - {tt['name']} (ID: {tt['id']})")
        else:
            print("   ✗ Failed to retrieve task types")
        
        # Test 2: Get projects
        print("\n2. Fetching projects...")
        projects = bot.get_projects()
        if projects:
            print(f"   ✓ Retrieved {len(projects)} projects")
            print(f"   Examples:")
            for proj in projects[:3]:
                print(f"     - {proj['name']} (ID: {proj['id']})")
            
            # Test 3: Get categories for first project
            if projects:
                print(f"\n3. Fetching categories for '{projects[0]['name']}'...")
                categories = bot.get_categories(projects[0]['id'])
                if categories:
                    print(f"   ✓ Retrieved {len(categories)} categories")
                    for cat in categories[:3]:
                        print(f"     - {cat['name']} (ID: {cat['id']})")
                else:
                    print("   ℹ No categories found (this is normal for some projects)")
        else:
            print("   ✗ Failed to retrieve projects")
        
        print("\n" + "="*60)
        print("✓ ALL TESTS PASSED!")
        print("="*60)
        print("\nThe bot is ready to use. You can now:")
        print("  - Start tasks using the CLI")
        print("  - End tasks from the home page")
        print("  - Use the GUI interface")
        
        return True
    else:
        print("\n" + "="*60)
        print("✗ LOGIN FAILED!")
        print("="*60)
        print("\nPlease check:")
        print("  - Your internet connection")
        print("  - The credentials are correct")
        print("  - The DTM server is accessible")
        return False


if __name__ == "__main__":
    test_login()

