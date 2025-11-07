#!/usr/bin/env python3
"""
Quick start a task for testing
"""

from dtm_bot import DTMBot

def main():
    bot = DTMBot()

    if bot.login("nithila@payable.lk", "Aqua1483@2003"):
        print("✓ Login successful!")

        # Find PropTech project
        projects = bot.get_projects()
        proptech = next((p for p in projects if 'PropTech' in p['name']), None)

        if proptech:
            print(f"✓ Found PropTech project: {proptech['id']}")

            # Find Development task type
            task_types = bot.get_task_types()
            dev_type = next((t for t in task_types if t['name'] == 'Development'), None)

            if dev_type:
                print(f"✓ Found Development task type: {dev_type['id']}")

                # Start a test task
                success = bot.start_task(
                    task_type_id=dev_type['id'],
                    project_id=proptech['id'],
                    task_description="Testing DTM Bot - Mobile app development"
                )

                if success:
                    print("✓ Task started successfully!")
                    print("You can now end it from the home page or using the bot.end_task() method")
                else:
                    print("✗ Failed to start task")
            else:
                print("✗ Development task type not found")
        else:
            print("✗ PropTech project not found")
    else:
        print("✗ Login failed")

if __name__ == "__main__":
    main()
