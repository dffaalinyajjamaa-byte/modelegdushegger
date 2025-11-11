-- Insert Grade 8 English Quiz with 42 questions
INSERT INTO exams (
  title,
  description,
  subject,
  grade_level,
  duration_minutes,
  total_marks,
  questions
) VALUES (
  'Grade 8 English Comprehensive Quiz',
  'Complete English language assessment covering grammar, vocabulary, and comprehension',
  'English',
  'Grade 8',
  60,
  42,
  '[
    {"id": "1", "question": "They were cooking food. What is the question form of this sentence?", "options": ["Were they cooking food?", "Are they cooking food?", "Do they cooking food?", "Was they cooking food?"], "correct_answer": 0, "marks": 1},
    {"id": "2", "question": "My elder brother doesn''t ______ the meeting.", "options": ["attend", "attended", "attending", "attends"], "correct_answer": 0, "marks": 1},
    {"id": "3", "question": "They _______ go near the lake because there are dangerous crocodiles in the lake.", "options": ["must", "don''t have to", "should", "mustn''t"], "correct_answer": 3, "marks": 1},
    {"id": "4", "question": "The exam was _________ than we expected.", "options": ["more difficult", "difficult", "most difficult", "least difficult"], "correct_answer": 0, "marks": 1},
    {"id": "5", "question": "She ________ migrate to France.", "options": ["would", "will", "going", "is going to"], "correct_answer": 3, "marks": 1},
    {"id": "6", "question": "My brother agreed _________ a new car.", "options": ["to buy", "buying", "as buy", "buy"], "correct_answer": 0, "marks": 1},
    {"id": "7", "question": "The younger you are, the __________ it is to learn.", "options": ["easier", "easy", "easiest", "easier"], "correct_answer": 0, "marks": 1},
    {"id": "8", "question": "The park gates _____ at 6.30 p.m. every evening.", "options": ["were locked", "lock", "are locked", "locks"], "correct_answer": 2, "marks": 1},
    {"id": "9", "question": "Why didn''t she _________ to school?", "options": ["come", "coming", "came", "comes"], "correct_answer": 0, "marks": 1},
    {"id": "10", "question": "He has taught English _______ 1985E.C.", "options": ["just", "since", "for", "yet"], "correct_answer": 1, "marks": 1},
    {"id": "11", "question": "Nurses ______ after patients in hospital every morning.", "options": ["looks", "are looking", "looked", "look"], "correct_answer": 3, "marks": 1},
    {"id": "12", "question": "While my aunt was reading newspaper, the phone _________.", "options": ["rang", "was rung", "ring", "had rung"], "correct_answer": 0, "marks": 1},
    {"id": "13", "question": "She is going to the park _________ Sunday.", "options": ["in", "at", "by", "on"], "correct_answer": 3, "marks": 1},
    {"id": "14", "question": "I did not spend as much money as you. This is the same as:", "options": ["You spent more money than me.", "You save more money than me.", "I spent more money than you.", "We spent much money equally."], "correct_answer": 0, "marks": 1},
    {"id": "15", "question": "Fasika enjoys _________ a movie.", "options": ["to watch", "for watch", "watching", "watch"], "correct_answer": 2, "marks": 1},
    {"id": "16", "question": "Mesfin was ________ mountain climber in the team.", "options": ["more experienced than", "the most experienced", "experienced than", "the less experienced"], "correct_answer": 1, "marks": 1},
    {"id": "17", "question": "Ahmed jumps __________ the fence.", "options": ["on", "at", "about", "over"], "correct_answer": 3, "marks": 1},
    {"id": "18", "question": "Which one of the following words has the voiceless sound /θ/?", "options": ["than", "thin", "father", "those"], "correct_answer": 1, "marks": 1},
    {"id": "19", "question": "Look! Hawa __________ to the cinema with two of her friends.", "options": ["is going", "will go", "goes", "goin"], "correct_answer": 0, "marks": 1},
    {"id": "20", "question": "I ______ my keys at home this morning.", "options": ["leaves", "leaved", "left", "was left"], "correct_answer": 2, "marks": 1},
    {"id": "21", "question": "I can''t find my bag. _________ you ____ it?", "options": ["Did/see", "Have/seen", "Has/seen", "Do/see"], "correct_answer": 1, "marks": 1},
    {"id": "22", "question": "Many accidents _________ by careless driving.", "options": ["caused", "are caused", "causes", "is caused"], "correct_answer": 1, "marks": 1},
    {"id": "23", "question": "A: ___________________\nB: It is approximately 120 million people.", "options": ["When did the population of Ethiopia reach 120 million?", "Why do 120 million people live in Ethiopia?", "What is the population of Ethiopia?", "How do 120 million people live in Ethiopia?"], "correct_answer": 2, "marks": 1},
    {"id": "24", "question": "A: How far is Bole from Mexico?\nB: ______________", "options": ["It''s nearly 11 kilometers.", "It is too late to reach Mexico.", "You can use a taxi.", "Mexico is the most attractive area."], "correct_answer": 0, "marks": 1},
    {"id": "25", "question": "A: Would you like to have a cup of tea?\nB: _____________. I have just had.", "options": ["certainly", "No, thanks", "I would love to", "That sounds good"], "correct_answer": 1, "marks": 1},
    {"id": "26", "question": "Yosef: ____________________________\nKebron: You should listen to audio materials and practice regularly.", "options": ["Where shall I go to learn French language?", "What shall I do if I want to learn French language?", "How much time will it take to learn French language?", "Shall I learn French language?"], "correct_answer": 1, "marks": 1},
    {"id": "27", "question": "Muse: In my opinion, working with people strengthens one''s social relationship.\nSirak: __________! It is essential to have positive connection with people.", "options": ["I am not sure", "Absolutely not", "Exactly", "I don''t agree"], "correct_answer": 2, "marks": 1},
    {"id": "28", "question": "Lema: ___________________________\nTola: Not more than four, I guess.", "options": ["Why did you read fiction books?", "How many fiction books did you read", "Where did you read fiction books?", "How often did you read fiction books?"], "correct_answer": 1, "marks": 1},
    {"id": "29", "question": "Elsa: Millions of people were starved last year.\nGirma: What was the reason?\nElsa: There was no adequate rain.\nGirma:_____________________?\nElsa: for two years.", "options": ["For what reason", "Are you sure", "For how long", "What for"], "correct_answer": 2, "marks": 1},
    {"id": "30", "question": "Mother: The guests are very tired.\nMy uncle: __________________", "options": ["They need some rest", "They need to go on foot", "They need to work more", "They need some drinks"], "correct_answer": 0, "marks": 1},
    {"id": "31", "question": "Helen: Will you go out with me tonight?\nSami: _____________________________\nGech: It''s ok! We can make it some other time.", "options": ["Why not?", "That''s great", "Yes, of course I will", "Sorry, I have plans for tonight."], "correct_answer": 3, "marks": 1},
    {"id": "32", "question": "Boss: We need to reduce costs and lay off about fifty staff by the end of the year.\nAssistant: ____________, but I don''t think we need to lay off that many.", "options": ["I see your point", "Exactly", "I totally disagree", "I don''t agree"], "correct_answer": 0, "marks": 1},
    {"id": "33", "question": "My friend: What animals did you see in the zoo?\nMe: __________________________.", "options": ["I fed leaves to a giraffe", "I went to the zoo", "They are huge", "Only giraffe and elephant"], "correct_answer": 3, "marks": 1},
    {"id": "34", "question": "Mohammed: What does your uncle do for living?\nAklilu: ______________________.", "options": ["He is in a bank", "He lives in Addis", "He works very hard in a bank", "He is a farmer"], "correct_answer": 3, "marks": 1},
    {"id": "35", "question": "Arrange: home/is/no/place/like/there", "options": ["There is no place like home.", "There is no home like place.", "There home is no like place.", "There place is like no home."], "correct_answer": 0, "marks": 1},
    {"id": "36", "question": "Arrange: with/she/her/lives/parents", "options": ["She lives parents with her.", "She lives with her parents.", "With her parents she lives.", "Her with she lives parents"], "correct_answer": 1, "marks": 1},
    {"id": "37", "question": "Arrange: his/many/admire/work/people", "options": ["His people admire many work.", "His work admire many people.", "Many people admire his work.", "Many admire his work people"], "correct_answer": 2, "marks": 1},
    {"id": "38", "question": "Read sentences 1-4 and arrange them in correct order:\n1. I don''t know why she was different person suddenly.\n2. She was very good person at first.\n3. Kidist and I have been friends for many years.\n4. But she started to change after sometimes.", "options": ["1,3,2,4", "3,2,4,1", "3,2,4,1", "3,4,1,2"], "correct_answer": 1, "marks": 4}
  ]'::jsonb
);

-- Insert placeholder exams for other Grade 8 subjects
INSERT INTO exams (title, description, subject, grade_level, duration_minutes, total_marks, questions)
VALUES
  ('Afaan Oromoo - Qorannoo Sadarkaa 8', 'Qorannoo Afaan Oromoo guutuu', 'Afaan Oromoo', 'Grade 8', 45, 30, '[]'::jsonb),
  ('Amharic - ምዘና ክፍል 8', 'የአማርኛ ቋንቋ ሙሉ ምዘና', 'Amharic', 'Grade 8', 45, 30, '[]'::jsonb),
  ('Sayinsii Waligalaa - Qorannoo 8', 'Qorannoo Saayinsii Uumamaa fi Jiraataa', 'Sayinsii Waligalaa', 'Grade 8', 60, 40, '[]'::jsonb),
  ('Gadaa System Quiz', 'Understanding the Gadaa democratic system', 'Gadaa', 'Grade 8', 40, 25, '[]'::jsonb),
  ('Lammummaa - Citizenship Education', 'Barnoota Lammummaa fi Seera', 'Lammummaa', 'Grade 8', 40, 25, '[]'::jsonb),
  ('Herreega - Mathematics Grade 8', 'Complete Mathematics Assessment', 'Herreega', 'Grade 8', 60, 50, '[]'::jsonb);